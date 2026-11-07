$ErrorActionPreference = "Stop"

function Titulo($mensagem) {
    Write-Host "`n====================================" -ForegroundColor Cyan
    Write-Host " $mensagem" -ForegroundColor Cyan
    Write-Host "====================================" -ForegroundColor Cyan
}

try {
    Titulo "ESPETINHO MANAGER - CONFIGURACAO SUPABASE"

    # Verificar dependencias
    Titulo "Verificando dependencias"

    if (!(Test-Path "node_modules")) {
        Write-Host "Instalando dependencias do projeto..."
        npm install
    }

    # Verificar Supabase CLI
    Write-Host "`nVerificando Supabase CLI..."

    npx supabase --version

    # Verificar autenticacao no Supabase
    Titulo "Verificando autenticacao"

    Write-Host "Verificando acesso a conta Supabase..."

    npx supabase projects list

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Voce ainda nao esta autenticado no Supabase." -ForegroundColor Yellow
        Write-Host "Execute uma unica vez, em um terminal normal:"
        Write-Host "npx supabase login" -ForegroundColor Cyan
        throw "Autenticacao necessaria."
    }

    Write-Host "Autenticacao confirmada!" -ForegroundColor Green

    # Vincular projeto
    Titulo "Vincular projeto"

    $projectId = Read-Host "Digite o Project ID do Supabase"

    if ([string]::IsNullOrWhiteSpace($projectId)) {
        throw "Project ID nao informado."
    }

    npx supabase link --project-ref $projectId

    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao vincular o projeto."
    }

    # Configurar APP_URL
    Titulo "Configurar endereco do sistema"

    $appUrl = Read-Host "Digite a URL do sistema (ex: http://localhost:5173)"

    if ([string]::IsNullOrWhiteSpace($appUrl)) {
        $appUrl = "http://localhost:5173"
    }

    npx supabase secrets set "APP_URL=$appUrl"

    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao configurar APP_URL."
    }

    # Publicar Edge Function
    Titulo "Publicar funcao de gerenciamento"

    npx supabase functions deploy gerenciar-usuarios

    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao publicar a Edge Function."
    }

    Titulo "CONFIGURACAO CONCLUIDA"

    Write-Host "Supabase configurado com sucesso!" -ForegroundColor Green
}
catch {
    Write-Host "`nERRO: $_" -ForegroundColor Red
}

Read-Host "`nPressione ENTER para fechar"