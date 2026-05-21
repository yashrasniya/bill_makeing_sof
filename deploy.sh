VITE_APP_URL=/api npm run build
cd build
scp  -i "/Users/yash/.ssh/ssh-key-2026-03-03.key" -r . ubuntu@80.225.251.106:/home/ubuntu/build