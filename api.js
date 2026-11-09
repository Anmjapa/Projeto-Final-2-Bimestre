"use strict";

const API_URL = "https://felipemaciel.com.br/_fatec/api/central-chamados/chamados";

const MENSAGENS_HTTP = {
  400: "A API recebeu um JSON inválido.",
  401: "Token inválido. Confira o valor recebido do professor.",
  404: "O chamado não foi encontrado.",
  405: "A API não aceita este método para a rota.",
  413: "Os dados enviados ultrapassam o limite da API.",
  415: "A API esperava dados no formato JSON.",
  422: "Verifique os dados do chamado.",
  500: "A API encontrou uma falha interna. Tente novamente.",
};

class ErroApi extends Error {
  constructor(status, mensagem, campos = {}) {
    super(mensagem);
    this.status = status;
    this.campos = campos ?? {};
  }
}

async function requisitarChamados(token, metodo, id, dados) {
  const url = id === undefined ? API_URL : API_URL + "/" + encodeURIComponent(id);
  const opcoes = {
    method: metodo,
    headers: { Accept: "application/json", Authorization: "Bearer " + token },
    signal: AbortSignal.timeout(15000),
  };

  if (dados !== undefined) {
    opcoes.headers["Content-Type"] = "application/json";
    opcoes.body = JSON.stringify(dados);
  }

  let resposta;
  let json;
  try {
    resposta = await fetch(url, opcoes);
    if (metodo === "DELETE" && resposta.status === 204) return;
    json = await resposta.json().catch((erro) => {
      if (!(erro instanceof SyntaxError)) throw erro;
      return null;
    });
  } catch (erro) {
    if (opcoes.signal.aborted) throw new Error("A API demorou para responder. Tente novamente.");
    throw new Error("Não foi possível acessar a API. Verifique a conexão e tente novamente.");
  }

  if (!resposta.ok) {
    const mensagem = json?.erro?.mensagem || MENSAGENS_HTTP[resposta.status] || "Falha na requisição.";
    throw new ErroApi(resposta.status, mensagem, json?.erro?.campos);
  }

  const resultado = json?.dados;
  const esperaLista = metodo === "GET" && id === undefined;
  if (esperaLista ? !Array.isArray(resultado) : resultado?.id == null) {
    throw new Error("A API retornou dados em um formato inesperado.");
  }
  return resultado;
}

function criarClienteChamados(modo, requisitar) {
  return {
    modo,
    listar: () => requisitar("GET"),
    detalhar: (id) => requisitar("GET", id),
    criar: (dados) => requisitar("POST", undefined, dados),
    editar: (id, dados) => requisitar("PUT", id, dados),
    excluir: (id) => requisitar("DELETE", id),
  };
}

function conectarClienteApi(token) {
  return criarClienteChamados("api", (metodo, id, dados) => requisitarChamados(token, metodo, id, dados));
}

function criarClienteDemonstracao() {
  // Os exemplos vivem na memória desta sessão. Cada nova demonstração começa com a mesma lista.
  let chamados = [
    {
      id: 5, titulo: "Wi-Fi instável no laboratório",
      descricao: "A conexão cai várias vezes durante as aulas no laboratório 2.",
      categoria: "rede", prioridade: "alta", status: "aberto", criado_em: "2026-11-05 09:20:00",
    },
    {
      id: 4, titulo: "Computador do laboratório não liga",
      descricao: "Ao pressionar o botão, nenhuma luz acende. O equipamento está na bancada 4.",
      categoria: "hardware", prioridade: "alta", status: "em_andamento", criado_em: "2026-11-04 14:30:00",
    },
    {
      id: 3, titulo: "Instalação do editor de código",
      descricao: "O laboratório precisa do editor atualizado para a próxima aula.",
      categoria: "software", prioridade: "media", status: "aberto", criado_em: "2026-11-03 10:15:00",
    },
    {
      id: 2, titulo: "Projetor não reconhece o cabo HDMI",
      descricao: "O cabo foi substituído e a imagem voltou a funcionar.",
      categoria: "hardware", prioridade: "media", status: "concluido", criado_em: "2026-11-02 16:05:00",
    },
    {
      id: 1, titulo: "Solicitação de orientação para impressão",
      descricao: "Preciso de instruções para usar a impressora compartilhada.",
      categoria: "outro", prioridade: "baixa", status: "concluido", criado_em: "2026-11-01 11:00:00",
    },
  ].map((chamado) => ({ ...chamado, atualizado_em: chamado.criado_em }));
  let proximoId = 6;

  return criarClienteChamados("demo", async (metodo, id, dados) => {
    if (metodo === "GET" && id === undefined) return chamados.slice();

    const agora = new Date().toISOString();
    if (metodo === "POST") {
      const novo = { ...dados, id: proximoId++, status: "aberto", criado_em: agora, atualizado_em: agora };
      chamados.unshift(novo);
      return novo;
    }

    const indice = chamados.findIndex((chamado) => chamado.id === id);
    if (indice === -1) throw new ErroApi(404, MENSAGENS_HTTP[404]);

    switch (metodo) {
      case "GET":
        return chamados[indice];
      case "PUT":
        chamados[indice] = { ...chamados[indice], ...dados, atualizado_em: agora };
        return chamados[indice];
      case "DELETE":
        chamados.splice(indice, 1);
        return;
    }
  });
}
