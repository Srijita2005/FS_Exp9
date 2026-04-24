const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mern_todo';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images allowed'), false);
}});

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ===================== MODELS =====================

const todoSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Todo = mongoose.model('Todo', todoSchema);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  bio: { type: String, default: '', maxlength: 300 },
  avatar: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});
userSchema.methods.comparePassword = function (pw) { return bcrypt.compare(pw, this.password); };
const User = mongoose.model('User', userSchema);

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', postSchema);

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 500 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

// Social Media Models
const socialPostSchema = new mongoose.Schema({
  content: { type: String, required: true, maxlength: 2000 },
  image: { type: String, default: '' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const SocialPost = mongoose.model('SocialPost', socialPostSchema);

const socialCommentSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 500 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'SocialPost', required: true },
  createdAt: { type: Date, default: Date.now }
});
const SocialComment = mongoose.model('SocialComment', socialCommentSchema);

// ===================== AUTH MIDDLEWARE =====================
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(header.split(' ')[1], JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
}

// ===================== TODO API =====================
app.get('/api/todos', async (req, res) => {
  try { res.json(await Todo.find().sort({ createdAt: -1 })); } catch { res.status(500).json({ error: 'Failed' }); }
});
app.post('/api/todos', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
    res.status(201).json(await new Todo({ title: title.trim() }).save());
  } catch { res.status(500).json({ error: 'Failed' }); }
});
app.put('/api/todos/:id', async (req, res) => {
  try {
    const u = {};
    if (req.body.title !== undefined) u.title = req.body.title.trim();
    if (req.body.completed !== undefined) u.completed = req.body.completed;
    const t = await Todo.findByIdAndUpdate(req.params.id, u, { new: true, runValidators: true });
    t ? res.json(t) : res.status(404).json({ error: 'Not found' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});
app.delete('/api/todos/:id', async (req, res) => {
  try { const t = await Todo.findByIdAndDelete(req.params.id); t ? res.json({ message: 'Deleted' }) : res.status(404).json({ error: 'Not found' }); }
  catch { res.status(500).json({ error: 'Failed' }); }
});

// ===================== AUTH API =====================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });
    if (await User.findOne({ $or: [{ email }, { username }] })) return res.status(400).json({ error: 'User exists' });
    const user = await new User({ username, email, password }).save();
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email, bio: user.bio } });
  } catch (err) { res.status(500).json({ error: err.message || 'Failed' }); }
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'All fields required' });
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, bio: user.bio } });
  } catch { res.status(500).json({ error: 'Failed' }); }
});
app.get('/api/auth/me', auth, async (req, res) => {
  try { const u = await User.findById(req.user.id).select('-password'); u ? res.json(u) : res.status(404).json({ error: 'Not found' }); }
  catch { res.status(500).json({ error: 'Failed' }); }
});
app.put('/api/auth/profile', auth, async (req, res) => {
  try { res.json(await User.findByIdAndUpdate(req.user.id, { bio: req.body.bio }, { new: true }).select('-password')); }
  catch { res.status(500).json({ error: 'Failed' }); }
});

// ===================== BLOG POSTS API =====================
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'username').sort({ createdAt: -1 });
    const r = await Promise.all(posts.map(async p => ({ ...p.toObject(), commentCount: await Comment.countDocuments({ post: p._id }) })));
    res.json(r);
  } catch { res.status(500).json({ error: 'Failed' }); }
});
app.get('/api/posts/:id', async (req, res) => {
  try {
    const p = await Post.findById(req.params.id).populate('author', 'username bio');
    if (!p) return res.status(404).json({ error: 'Not found' });
    const comments = await Comment.find({ post: p._id }).populate('author', 'username').sort({ createdAt: -1 });
    res.json({ ...p.toObject(), comments });
  } catch { res.status(500).json({ error: 'Failed' }); }
});
app.post('/api/posts', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
    const p = await new Post({ title, content, author: req.user.id }).save();
    res.status(201).json(await p.populate('author', 'username'));
  } catch { res.status(500).json({ error: 'Failed' }); }
});
app.put('/api/posts/:id', auth, async (req, res) => {
  try {
    const p = await Post.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    if (p.author.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (req.body.title) p.title = req.body.title;
    if (req.body.content) p.content = req.body.content;
    p.updatedAt = Date.now(); await p.save();
    res.json(await p.populate('author', 'username'));
  } catch { res.status(500).json({ error: 'Failed' }); }
});
app.delete('/api/posts/:id', auth, async (req, res) => {
  try {
    const p = await Post.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    if (p.author.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await Comment.deleteMany({ post: p._id }); await p.deleteOne();
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});
app.get('/api/posts/:postId/comments', async (req, res) => {
  try { res.json(await Comment.find({ post: req.params.postId }).populate('author', 'username').sort({ createdAt: -1 })); }
  catch { res.status(500).json({ error: 'Failed' }); }
});
app.post('/api/posts/:postId/comments', auth, async (req, res) => {
  try {
    if (!req.body.text) return res.status(400).json({ error: 'Text required' });
    const p = await Post.findById(req.params.postId);
    if (!p) return res.status(404).json({ error: 'Not found' });
    const c = await new Comment({ text: req.body.text, author: req.user.id, post: p._id }).save();
    res.status(201).json(await c.populate('author', 'username'));
  } catch { res.status(500).json({ error: 'Failed' }); }
});
app.delete('/api/comments/:id', auth, async (req, res) => {
  try {
    const c = await Comment.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (c.author.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await c.deleteOne(); res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ===================== SOCIAL MEDIA API =====================
// Feed
app.get('/api/social/posts', async (req, res) => {
  try {
    const posts = await SocialPost.find().populate('author', 'username avatar').sort({ createdAt: -1 });
    const r = await Promise.all(posts.map(async p => ({
      ...p.toObject(), commentCount: await SocialComment.countDocuments({ post: p._id })
    })));
    res.json(r);
  } catch { res.status(500).json({ error: 'Failed' }); }
});
// Single post
app.get('/api/social/posts/:id', async (req, res) => {
  try {
    const p = await SocialPost.findById(req.params.id).populate('author', 'username avatar bio');
    if (!p) return res.status(404).json({ error: 'Not found' });
    const comments = await SocialComment.find({ post: p._id }).populate('author', 'username avatar').sort({ createdAt: -1 });
    res.json({ ...p.toObject(), comments });
  } catch { res.status(500).json({ error: 'Failed' }); }
});
// Create post (with optional image)
app.post('/api/social/posts', auth, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const data = { content, author: req.user.id };
    if (req.file) data.image = '/uploads/' + req.file.filename;
    const p = await new SocialPost(data).save();
    res.status(201).json(await p.populate('author', 'username avatar'));
  } catch { res.status(500).json({ error: 'Failed' }); }
});
// Edit post
app.put('/api/social/posts/:id', auth, async (req, res) => {
  try {
    const p = await SocialPost.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    if (p.author.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (req.body.content) p.content = req.body.content;
    p.updatedAt = Date.now(); await p.save();
    res.json(await p.populate('author', 'username avatar'));
  } catch { res.status(500).json({ error: 'Failed' }); }
});
// Delete post
app.delete('/api/social/posts/:id', auth, async (req, res) => {
  try {
    const p = await SocialPost.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    if (p.author.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await SocialComment.deleteMany({ post: p._id }); await p.deleteOne();
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});
// Like / Unlike
app.post('/api/social/posts/:id/like', auth, async (req, res) => {
  try {
    const p = await SocialPost.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    const idx = p.likes.indexOf(req.user.id);
    if (idx === -1) p.likes.push(req.user.id); else p.likes.splice(idx, 1);
    await p.save();
    res.json({ likes: p.likes, liked: idx === -1 });
  } catch { res.status(500).json({ error: 'Failed' }); }
});
// Comments
app.post('/api/social/posts/:id/comments', auth, async (req, res) => {
  try {
    if (!req.body.text) return res.status(400).json({ error: 'Text required' });
    const p = await SocialPost.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    const c = await new SocialComment({ text: req.body.text, author: req.user.id, post: p._id }).save();
    res.status(201).json(await c.populate('author', 'username avatar'));
  } catch { res.status(500).json({ error: 'Failed' }); }
});
app.delete('/api/social/comments/:id', auth, async (req, res) => {
  try {
    const c = await SocialComment.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (c.author.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await c.deleteOne(); res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// ===================== CATCH-ALL =====================
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
