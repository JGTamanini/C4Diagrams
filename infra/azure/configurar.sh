#!/usr/bin/env bash
# Configuração do ambiente de produção na Azure (C4Diagrams).
#
# Parte dos recursos já existentes (criados uma vez no portal, sem custo adicional depois disso):
#   - Grupo de recursos  c4diagrams (Canada Central)
#   - App Service plan   ASP-c4diagrams-a117 (B1, Linux)
#   - Web App            c4diagrams (container)
#   - PostgreSQL         c4diagrams-database (Flexible Server, B1ms, PostgreSQL 18)
# e aplica a configuração que o deploy precisa. Não cria nenhum recurso pago.
# Pode ser executado de novo: cada passo verifica o estado antes de alterar.
#
# Uso: az login (com MFA, se o diretório exigir) e depois  bash infra/azure/configurar.sh
set -euo pipefail

RG=c4diagrams
WEB_APP=c4diagrams
DB_SERVER=c4diagrams-database
DB_NAME=c4diagrams
DEPLOY_APP_NAME=c4diagrams-github-deploy
GITHUB_REPO=JGTamanini/C4Diagrams
GITHUB_ENVIRONMENT=production

echo "== Banco da aplicação"
if ! az postgres flexible-server db show -g "$RG" --server-name "$DB_SERVER" --name "$DB_NAME" --output none 2>/dev/null; then
  az postgres flexible-server db create -g "$RG" --server-name "$DB_SERVER" --name "$DB_NAME" --output none
fi

echo "== Firewall do banco: só os IPs de saída do Web App"
existing_ips=$(az postgres flexible-server firewall-rule list -g "$RG" --server-name "$DB_SERVER" --query "[].startIpAddress" -o tsv)
index=0
for ip in $(az webapp show -g "$RG" -n "$WEB_APP" --query possibleOutboundIpAddresses -o tsv | tr ',' ' '); do
  index=$((index + 1))
  if ! grep -qx "$ip" <<< "$existing_ips"; then
    az postgres flexible-server firewall-rule create -g "$RG" --server-name "$DB_SERVER" \
      --name "$(printf 'webapp-saida-%02d' "$index")" --start-ip-address "$ip" --end-ip-address "$ip" --output none
  fi
done
# Remove regras amplas (internet inteira ou "todos os serviços da Azure"), que expõem o banco
for rule in $(az postgres flexible-server firewall-rule list -g "$RG" --server-name "$DB_SERVER" \
  --query "[?startIpAddress=='0.0.0.0'].name" -o tsv); do
  az postgres flexible-server firewall-rule delete -g "$RG" --server-name "$DB_SERVER" --name "$rule" --yes
done

echo "== Web App: sem FTP nem credenciais básicas (só o pipeline publica), Always On e health check"
az webapp config set -g "$RG" -n "$WEB_APP" --ftps-state Disabled --always-on true --output none
for kind in ftp scm; do
  az resource update -g "$RG" --namespace Microsoft.Web --resource-type basicPublishingCredentialsPolicies \
    --parent "sites/$WEB_APP" --name "$kind" --set properties.allow=false --output none
done
site_id=$(az webapp show -g "$RG" -n "$WEB_APP" --query id -o tsv)
az resource update --ids "$site_id/config/web" --set properties.healthCheckPath=/api/health --output none

echo "== Identidade do GitHub Actions (OIDC): só o ambiente production, só este Web App"
app_id=$(az ad app list --display-name "$DEPLOY_APP_NAME" --query "[0].appId" -o tsv)
if [ -z "$app_id" ]; then
  app_id=$(az ad app create --display-name "$DEPLOY_APP_NAME" --sign-in-audience AzureADMyOrg --query appId -o tsv)
fi
sp_id=$(az ad sp list --filter "appId eq '$app_id'" --query "[0].id" -o tsv)
if [ -z "$sp_id" ]; then
  sp_id=$(az ad sp create --id "$app_id" --query id -o tsv)
fi
if [ -z "$(az ad app federated-credential list --id "$app_id" --query "[?name=='github-production'].name" -o tsv)" ]; then
  az ad app federated-credential create --id "$app_id" --output none --parameters "{
    \"name\": \"github-production\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:$GITHUB_REPO:environment:$GITHUB_ENVIRONMENT\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"
fi
if [ -z "$(az role assignment list --assignee "$sp_id" --scope "$site_id" --query "[?roleDefinitionName=='Website Contributor'].id" -o tsv)" ]; then
  az role assignment create --assignee-object-id "$sp_id" --assignee-principal-type ServicePrincipal \
    --role "Website Contributor" --scope "$site_id" --output none
fi

echo
echo "Pronto. Variáveis do ambiente '$GITHUB_ENVIRONMENT' no GitHub:"
echo "  AZURE_CLIENT_ID=$app_id"
echo "  AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)"
echo "  AZURE_SUBSCRIPTION_ID=$(az account show --query id -o tsv)"
echo "Segredos do repositório: DATABASE_URL, JWT_SECRET, RESEND_API_KEY, NEW_RELIC_LICENSE_KEY"
