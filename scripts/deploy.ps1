$ErrorActionPreference = 'Stop'
minikube status *> $null
if ($LASTEXITCODE -ne 0) { minikube start }
minikube addons enable ingress
minikube image build -t cavalocal-backend:local backend
minikube image build -t cavalocal-audit:local audit-service
minikube image build -t cavalocal-dashboard:local audit-dashboard
minikube image build -t cavalocal-web:local web
kubectl apply -f k8s/
kubectl rollout status statefulset/postgres --timeout=180s
kubectl rollout status statefulset/rabbitmq --timeout=240s
kubectl rollout status deployment/cavalocal-backend --timeout=240s
kubectl rollout status deployment/audit-service --timeout=240s
kubectl rollout status deployment/audit-dashboard --timeout=180s
kubectl rollout status deployment/cavalocal-web --timeout=180s
kubectl exec deployment/cavalocal-backend -- npm run prisma:seed
$clusterIp = minikube ip
Write-Host "Listo. Agrega al hosts como administrador: $clusterIp conjunta3p.espe.edu.ec"
