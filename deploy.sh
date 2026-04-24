#!/bin/bash
# AWS EC2 Deployment Script for MERN Stack Projects
# Usage: bash deploy.sh <your-aws-secret-access-key>

set -e

REGION="ap-south-1"
KEY_NAME="mern-app-key"
SG_NAME="mern-app-sg"
INSTANCE_TYPE="t2.micro"
AMI_ID="ami-0dee22c13ea7a9a67"  # Amazon Linux 2023 in ap-south-1

echo "🔧 Configuring AWS CLI..."
aws configure set region $REGION

# Create security group
echo "🔒 Creating security group..."
SG_ID=$(aws ec2 create-security-group \
  --group-name $SG_NAME \
  --description "MERN Stack App" \
  --query 'GroupId' --output text 2>/dev/null || \
  aws ec2 describe-security-groups --group-names $SG_NAME --query 'SecurityGroups[0].GroupId' --output text)

# Allow SSH, HTTP, HTTPS, and app port
for PORT in 22 80 443 3000; do
  aws ec2 authorize-security-group-ingress --group-id $SG_ID \
    --protocol tcp --port $PORT --cidr 0.0.0.0/0 2>/dev/null || true
done
echo "  Security Group: $SG_ID"

# Create key pair
echo "🔑 Creating key pair..."
aws ec2 create-key-pair --key-name $KEY_NAME \
  --query 'KeyMaterial' --output text > ${KEY_NAME}.pem 2>/dev/null || echo "  Key pair exists"
chmod 400 ${KEY_NAME}.pem 2>/dev/null || true

# Create user data script to bootstrap the instance
cat > /tmp/userdata.sh << 'USERDATA'
#!/bin/bash
yum update -y
yum install -y git nodejs npm

# Install MongoDB
cat > /etc/yum.repos.d/mongodb-org-7.0.repo << 'EOF'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2023/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc
EOF
yum install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Create app directory
mkdir -p /home/ec2-user/app
cd /home/ec2-user/app

# App will be deployed via SCP after instance is ready
echo "Instance bootstrapped" > /home/ec2-user/ready.txt
USERDATA

# Launch EC2 instance
echo "🚀 Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type $INSTANCE_TYPE \
  --key-name $KEY_NAME \
  --security-group-ids $SG_ID \
  --user-data file:///tmp/userdata.sh \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=MERNStackApp}]" \
  --query 'Instances[0].InstanceId' --output text)

echo "  Instance ID: $INSTANCE_ID"

# Wait for instance to be running
echo "⏳ Waiting for instance to start..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo ""
echo "✅ EC2 Instance is running!"
echo "  Public IP: $PUBLIC_IP"
echo "  URL: http://$PUBLIC_IP:3000"
echo ""
echo "📦 Wait ~2 min for bootstrap, then deploy code:"
echo "  scp -i ${KEY_NAME}.pem -r ./* ec2-user@${PUBLIC_IP}:/home/ec2-user/app/"
echo "  ssh -i ${KEY_NAME}.pem ec2-user@${PUBLIC_IP} 'cd app && npm install && node server.js &'"
