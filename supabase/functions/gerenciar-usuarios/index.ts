import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authorization = req.headers.get("Authorization");

    if (!authorization) {
      return json({ error: "Não autorizado." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authorization.replace(/^Bearer\s+/i, "");

    // Cliente usado somente para validar quem está fazendo a solicitação.
    const supabaseAuth = createClient(supabaseUrl, anonKey);

    const { data: userData, error: authError } =
      await supabaseAuth.auth.getUser(token);

    if (authError || !userData.user) {
      return json({ error: "Sessão inválida." }, 401);
    }

    // Cliente administrativo, utilizado somente no servidor.
    const admin = createClient(supabaseUrl, serviceKey);

    // Confirma se o solicitante é um administrador ativo.
    const { data: perfil, error: perfilError } = await admin
      .from("perfis")
      .select("papel, ativo")
      .eq("id", userData.user.id)
      .single();

    if (
      perfilError ||
      !perfil ||
      perfil.papel !== "administrador" ||
      perfil.ativo !== true
    ) {
      return json({ error: "Apenas administradores podem realizar essa ação." }, 403);
    }

    const body = await req.json();
    const { acao } = body;

    // LISTAR USUÁRIOS
    if (acao === "listar") {
      const { data: perfis, error } = await admin
        .from("perfis")
        .select("id, nome, papel, ativo, criado_em")
        .order("nome");

      if (error) throw error;

      const { data: usuarios, error: usersError } =
        await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

      if (usersError) throw usersError;

      const resultado = (perfis || []).map((p) => ({
        ...p,
        email: usuarios.users.find((u) => u.id === p.id)?.email || "",
      }));

      return json({ usuarios: resultado });
    }

    // CRIAR USUÁRIO SEM ENVIAR E-MAIL
    if (acao === "criar") {
      const nome = String(body.nome || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const senha = String(body.senha || "");
      const papel = body.papel;

      if (!nome || !email || !email.includes("@")) {
        return json({ error: "Informe um nome e um e-mail válido." }, 400);
      }

      if (senha.length < 8) {
        return json({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);
      }

      if (!["administrador", "funcionario"].includes(papel)) {
        return json({ error: "Tipo de usuário inválido." }, 400);
      }

      // Cria a conta sem enviar e-mail de convite.
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome },
      });

      if (error) {
        console.error("Erro ao criar usuário:", error);
        throw error;
      }

      if (!data.user) {
        throw new Error("Não foi possível criar o usuário.");
      }

      // Atualiza o perfil criado pelo trigger do banco.
      const { error: updateError } = await admin
        .from("perfis")
        .update({ nome, papel, ativo: true })
        .eq("id", data.user.id);

      if (updateError) {
        await admin.auth.admin.deleteUser(data.user.id);
        throw updateError;
      }

      return json({
        mensagem: "Usuário criado com sucesso.",
        usuario: {
          id: data.user.id,
          nome,
          email,
          papel,
        },
      });
    }

    // ATIVAR OU DESATIVAR USUÁRIO
    if (acao === "alterar_status") {
      const id = String(body.id || "");
      const ativo = body.ativo;

      if (!id || typeof ativo !== "boolean") {
        return json({ error: "Dados inválidos." }, 400);
      }

      if (id === userData.user.id) {
        return json({ error: "Você não pode alterar seu próprio acesso." }, 400);
      }

      const { error } = await admin
        .from("perfis")
        .update({ ativo })
        .eq("id", id);

      if (error) throw error;

      return json({ mensagem: "Status atualizado com sucesso." });
    }
        // ALTERAR SENHA DE USUÁRIO
    if (acao === "alterar_senha") {
      const id = String(body.id || "").trim();
      const senha = String(body.senha || "");

      if (!id) {
        return json({ error: "Usuário não informado." }, 400);
      }

      if (senha.length < 8) {
        return json({
          error: "A nova senha deve ter pelo menos 8 caracteres."
        }, 400);
      }

      const { data, error } = await admin.auth.admin.updateUserById(
        id,
        { password: senha }
      );

      if (error) {
        console.error("Erro ao alterar senha:", error);
        return json({ error: "Não foi possível alterar a senha." }, 400);
      }

      if (!data.user) {
        return json({ error: "Usuário não encontrado." }, 404);
      }

      return json({
        mensagem: "Senha alterada com sucesso."
      });
    }
    return json({ error: "Ação desconhecida." }, 400);
  } catch (error) {
  console.error("ERRO NA EDGE FUNCTION:", error);
  console.error("MENSAGEM:", error instanceof Error ? error.message : String(error));

  return json({
    error: error instanceof Error ? error.message : String(error),
    detalhes: error instanceof Error ? error.stack : null
  }, 500);
}
});
