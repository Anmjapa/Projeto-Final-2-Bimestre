// Central de Chamados - Fatec Lins
// Toda a aplicação (interface + comunicação com a API) fica neste arquivo.

const API_URL = "https://felipemaciel.com.br/_fatec/api/central-chamados/chamados";
const TOKEN_PADRAO = "fd17edc7c76c9779bfa4f584ca1d19068c02059eec22bd0290423608ee4d5f7a";

let token = "";
let modoAtual = "offline"; // offline, api ou demo
let chamadosArr = [];
let chamadoEmEdicao = null;
let chamadoEmDetalhe = null;
let chamadoParaExcluir = null;
let temporizadorNotificacao = null;

const rotulos = {
  categoria: {
    hardware: "Hardware",
    software: "Software",
    rede: "Rede",
    outro: "Outro"
  },
  prioridade: {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta"
  },
  status: {
    aberto: "Aberto",
    em_andamento: "Em andamento",
    concluido: "Concluído"
  }
};

const dadosDemonstracao = [
  {
    id: "demo-1",
    titulo: "Computador do laboratório não liga",
    descricao: "Ao pressionar o botão de energia, o computador não inicia.",
    categoria: "hardware",
    prioridade: "alta",
    status: "aberto",
    criado_em: "2026-11-10 08:30:00",
    atualizado_em: "2026-11-10 08:30:00"
  },
  {
    id: "demo-2",
    titulo: "Instalação do pacote de escritório",
    descricao: "Preciso do pacote de escritório instalado para realizar as atividades.",
    categoria: "software",
    prioridade: "media",
    status: "em_andamento",
    criado_em: "2026-11-08 14:15:00",
    atualizado_em: "2026-11-09 09:20:00"
  },
  {
    id: "demo-3",
    titulo: "Conexão de rede instável",
    descricao: "A conexão cai algumas vezes durante as aulas.",
    categoria: "rede",
    prioridade: "baixa",
    status: "concluido",
    criado_em: "2026-11-05 19:00:00",
    atualizado_em: "2026-11-06 10:00:00"
  }
];

// Elementos da página
const indicadorConexao = document.querySelector("#indicador-conexao");
const botaoConectar = document.querySelector("#conectar");
const botaoNovoChamado = document.querySelector("#novo-chamado");
const botaoAtualizar = document.querySelector("#atualizar");
const botaoDemonstrar = document.querySelector("#demonstrar");
const botaoVazioConectar = document.querySelector("#vazio-conectar");
const botaoVazioNovo = document.querySelector("#vazio-novo");
const botaoTentarNovamente = document.querySelector("#tentar-novamente");
const botaoLimparFiltros = document.querySelector("#limpar-filtros");
const botaoLimparFiltrosRodape = document.querySelector("#limpar-filtros-rodape");

const dialogConexao = document.querySelector("#dialog-conexao");
const formConexao = document.querySelector("#form-conexao");
const campoToken = document.querySelector("#token");
const erroConexao = document.querySelector("#erro-conexao");
const botaoDesconectar = document.querySelector("#desconectar");
const botaoEnviarToken = document.querySelector("#enviar-token");

const campoBuscar = document.querySelector("#buscar");
const filtroStatus = document.querySelector("#filtrar-status");
const filtroPrioridade = document.querySelector("#filtrar-prioridade");
const listaChamados = document.querySelector("#lista-chamados");
const modeloLinha = document.querySelector("#modelo-linha");
const envoltoriaTabela = document.querySelector("#envoltoria-tabela");
const listaVazia = document.querySelector("#lista-vazia");
const carregandoLista = document.querySelector("#carregando-lista");
const resultadoLista = document.querySelector("#resultado-lista");
const erroLista = document.querySelector("#erro-lista");
const rodapeLista = document.querySelector("#rodape-lista");
const contagem = document.querySelector("#contagem");
const vazioTitulo = document.querySelector("#vazio-titulo");
const vazioDescricao = document.querySelector("#vazio-descricao");

const dialogDetalhe = document.querySelector("#dialog-detalhe");
const carregandoDetalhe = document.querySelector("#carregando-detalhe");
const dadosDetalhe = document.querySelector("#dados-detalhe");
const erroDetalhe = document.querySelector("#erro-detalhe");
const numeroDetalhe = document.querySelector("#numero-detalhe");
const tituloDetalhe = document.querySelector("#titulo-detalhe");
const statusDetalhe = document.querySelector("#status-detalhe");
const prioridadeDetalhe = document.querySelector("#prioridade-detalhe");
const descricaoDetalhe = document.querySelector("#descricao-detalhe");
const categoriaDetalhe = document.querySelector("#categoria-detalhe");
const criadoDetalhe = document.querySelector("#criado-detalhe");
const atualizadoDetalhe = document.querySelector("#atualizado-detalhe");
const botaoEditarDetalhe = document.querySelector("#editar-detalhe");

const dialogFormulario = document.querySelector("#dialog-formulario");
const formChamado = document.querySelector("#form-chamado");
const tituloFormulario = document.querySelector("#titulo-formulario");
const campoTitulo = document.querySelector("#campo-titulo");
const campoDescricao = document.querySelector("#campo-descricao");
const campoCategoria = document.querySelector("#campo-categoria");
const campoPrioridade = document.querySelector("#campo-prioridade");
const campoStatus = document.querySelector("#campo-status");
const rotuloCampoStatus = document.querySelector("#rotulo-campo-status");
const tamanhoDescricao = document.querySelector("#tamanho-descricao");
const erroFormulario = document.querySelector("#erro-formulario");
const botaoSalvarChamado = document.querySelector("#salvar-chamado");

const dialogExclusao = document.querySelector("#dialog-exclusao");
const nomeExclusao = document.querySelector("#nome-exclusao");
const erroExclusao = document.querySelector("#erro-exclusao");
const botaoConfirmarExclusao = document.querySelector("#confirmar-exclusao");
const notificacao = document.querySelector("#notificacao");

// Faz a requisição e interpreta as respostas da API.
async function requisicaoAPI(metodo, id = null, dados = null) {
  let url = id === null ? API_URL : `${API_URL}/${encodeURIComponent(id)}`;
  let cabecalhos = {
    Authorization: `Bearer ${token}`
  };

  let configuracao = {
    method: metodo,
    headers: cabecalhos
  };

  if (dados !== null) {
    cabecalhos["Content-Type"] = "application/json";
    configuracao.body = JSON.stringify(dados);
  }

  let resposta;

  try {
    resposta = await fetch(url, configuracao);
  } catch (erro) {
    let erroRede = new Error("Não foi possível acessar a API. Verifique sua conexão com a internet e tente novamente.");
    erroRede.status = 0;
    throw erroRede;
  }

  // A resposta 204 não possui corpo e, portanto, não deve ser convertida em JSON.
  let corpo = null;
  if (resposta.status !== 204) {
    let textoResposta = await resposta.text();

    if (textoResposta.trim() !== "") {
      try {
        corpo = JSON.parse(textoResposta);
      } catch (erro) {
        corpo = null;
      }
    }
  }

  if (!resposta.ok) {
    let mensagem = corpo && corpo.erro && corpo.erro.mensagem
      ? corpo.erro.mensagem
      : `A API retornou o erro HTTP ${resposta.status}.`;

    if (corpo && corpo.erro && corpo.erro.campos) {
      let errosCampos = Object.entries(corpo.erro.campos)
        .map(function ([campo, texto]) {
          return `${campo}: ${texto}`;
        })
        .join(" ");

      if (errosCampos) {
        mensagem += ` ${errosCampos}`;
      }
    }

    let erroAPI = new Error(mensagem);
    erroAPI.status = resposta.status;
    erroAPI.dados = corpo;
    throw erroAPI;
  }

  return corpo;
}

function abrirDialog(dialog) {
  if (dialog && !dialog.open) {
    dialog.showModal();
  }
}

function fecharDialog(dialog) {
  if (dialog && dialog.open) {
    dialog.close();
  }
}

function mostrarNotificacao(mensagem) {
  notificacao.textContent = mensagem;
  clearTimeout(temporizadorNotificacao);
  temporizadorNotificacao = setTimeout(function () {
    notificacao.textContent = "";
  }, 3500);
}

function mostrarErro(elemento, mensagem) {
  elemento.textContent = mensagem;
  elemento.hidden = false;
}

function limparErro(elemento) {
  elemento.textContent = "";
  elemento.hidden = true;
}

function definirModo(modo) {
  modoAtual = modo;

  if (modo === "api") {
    indicadorConexao.textContent = "Conectado à API";
    indicadorConexao.dataset.modo = "api";
    botaoDesconectar.hidden = false;
    botaoConectar.querySelector("span").textContent = "Conexão";
  } else if (modo === "demo") {
    indicadorConexao.textContent = "Modo demonstração";
    indicadorConexao.dataset.modo = "demo";
    botaoDesconectar.hidden = true;
    botaoConectar.querySelector("span").textContent = "Conectar API";
  } else {
    indicadorConexao.textContent = "Sem conexão";
    indicadorConexao.dataset.modo = "offline";
    botaoDesconectar.hidden = true;
    botaoConectar.querySelector("span").textContent = "Conectar API";
  }

  let conectado = modo !== "offline";
  campoBuscar.disabled = !conectado;
  filtroStatus.disabled = !conectado;
  filtroPrioridade.disabled = !conectado;
  botaoAtualizar.disabled = !conectado;
}

function formatarData(data) {
  if (!data) {
    return "Não informado";
  }

  let dataConvertida = new Date(String(data).replace(" ", "T"));
  if (Number.isNaN(dataConvertida.getTime())) {
    return data;
  }

  return dataConvertida.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function definirEtiqueta(elemento, valor, tipo) {
  elemento.textContent = rotulos[tipo][valor] || valor || "Não informado";
  elemento.dataset.valor = valor || "";
}

function atualizarResumo() {
  document.querySelector("#total").textContent = chamadosArr.length;
  document.querySelector("#total-aberto").textContent = chamadosArr.filter(function (chamado) {
    return chamado.status === "aberto";
  }).length;
  document.querySelector("#total-em-andamento").textContent = chamadosArr.filter(function (chamado) {
    return chamado.status === "em_andamento";
  }).length;
  document.querySelector("#total-concluido").textContent = chamadosArr.filter(function (chamado) {
    return chamado.status === "concluido";
  }).length;
}

function obterChamadosFiltrados() {
  let textoDigitado = campoBuscar.value.trim().toLowerCase();
  let statusSelecionado = filtroStatus.value;
  let prioridadeSelecionada = filtroPrioridade.value;

  return chamadosArr.filter(function (chamado) {
    let correspondeTitulo = chamado.titulo.toLowerCase().includes(textoDigitado);
    let correspondeStatus = statusSelecionado === "" || chamado.status === statusSelecionado;
    let correspondePrioridade = prioridadeSelecionada === "" || chamado.prioridade === prioridadeSelecionada;

    return correspondeTitulo && correspondeStatus && correspondePrioridade;
  });
}

function existemFiltrosAtivos() {
  return campoBuscar.value.trim() !== "" || filtroStatus.value !== "" || filtroPrioridade.value !== "";
}

function renderizarChamados() {
  listaChamados.replaceChildren();
  atualizarResumo();

  let chamadosFiltrados = obterChamadosFiltrados();
  carregandoLista.hidden = true;
  resultadoLista.setAttribute("aria-busy", "false");
  envoltoriaTabela.hidden = true;
  rodapeLista.hidden = true;
  listaVazia.hidden = false;

  if (modoAtual === "offline") {
    vazioTitulo.textContent = "Conecte-se para ver seus chamados";
    vazioDescricao.textContent = "Use o token da atividade ou explore a interface com dados de exemplo.";
    botaoVazioConectar.hidden = false;
    botaoDemonstrar.hidden = false;
    botaoVazioNovo.hidden = true;
    botaoLimparFiltros.hidden = true;
    botaoTentarNovamente.hidden = true;
    return;
  }

  botaoVazioConectar.hidden = true;
  botaoDemonstrar.hidden = true;
  botaoTentarNovamente.hidden = true;

  if (chamadosFiltrados.length === 0) {
    if (chamadosArr.length === 0) {
      vazioTitulo.textContent = "Você ainda não possui chamados";
      vazioDescricao.textContent = "Cadastre seu primeiro chamado para acompanhar a solicitação por aqui.";
      botaoVazioNovo.hidden = false;
      botaoLimparFiltros.hidden = true;
    } else {
      vazioTitulo.textContent = "Nenhum chamado encontrado";
      vazioDescricao.textContent = "Não encontramos chamados com os filtros informados.";
      botaoVazioNovo.hidden = true;
      botaoLimparFiltros.hidden = false;
    }
    return;
  }

  listaVazia.hidden = true;
  envoltoriaTabela.hidden = false;
  rodapeLista.hidden = false;
  botaoLimparFiltrosRodape.hidden = !existemFiltrosAtivos();

  chamadosFiltrados.forEach(function (chamado) {
    let linhaModelo = modeloLinha.content.cloneNode(true);
    let linha = linhaModelo.querySelector("tr");
    let linkChamado = linhaModelo.querySelector('[data-acao="detalhar"]');
    let numeroChamado = linhaModelo.querySelector(".numero-chamado");
    let categoria = linhaModelo.querySelector(".celula-categoria");
    let prioridade = linhaModelo.querySelector(".celula-prioridade .etiqueta");
    let status = linhaModelo.querySelector(".celula-status .etiqueta");
    let dataCriacao = linhaModelo.querySelector(".celula-data time");
    let botoesAcao = linhaModelo.querySelectorAll("[data-acao]");

    linkChamado.textContent = chamado.titulo;
    numeroChamado.textContent = `Chamado #${chamado.id}`;
    categoria.textContent = rotulos.categoria[chamado.categoria] || chamado.categoria;
    definirEtiqueta(prioridade, chamado.prioridade, "prioridade");
    definirEtiqueta(status, chamado.status, "status");
    dataCriacao.textContent = formatarData(chamado.criado_em);

    if (chamado.criado_em) {
      dataCriacao.dateTime = String(chamado.criado_em).replace(" ", "T");
    }

    botoesAcao.forEach(function (botao) {
      botao.dataset.id = chamado.id;
    });

    linha.dataset.id = chamado.id;
    listaChamados.appendChild(linhaModelo);
  });

  contagem.textContent = existemFiltrosAtivos()
    ? `${chamadosFiltrados.length} de ${chamadosArr.length} chamados`
    : `${chamadosArr.length} ${chamadosArr.length === 1 ? "chamado" : "chamados"}`;
}

function mostrarCarregamento() {
  limparErro(erroLista);
  carregandoLista.hidden = false;
  listaVazia.hidden = true;
  envoltoriaTabela.hidden = true;
  rodapeLista.hidden = true;
  resultadoLista.setAttribute("aria-busy", "true");
}

function mostrarFalhaNaLista(mensagem) {
  carregandoLista.hidden = true;
  listaVazia.hidden = false;
  envoltoriaTabela.hidden = true;
  rodapeLista.hidden = true;
  resultadoLista.setAttribute("aria-busy", "false");
  vazioTitulo.textContent = "Não foi possível carregar os chamados";
  vazioDescricao.textContent = "Confira a conexão e tente novamente.";
  botaoVazioConectar.hidden = true;
  botaoDemonstrar.hidden = true;
  botaoVazioNovo.hidden = true;
  botaoLimparFiltros.hidden = true;
  botaoTentarNovamente.hidden = false;
  mostrarErro(erroLista, mensagem);
}

async function atualizarChamados() {
  if (modoAtual === "offline") {
    renderizarChamados();
    return;
  }

  if (modoAtual === "demo") {
    renderizarChamados();
    return;
  }

  mostrarCarregamento();

  try {
    let resposta = await requisicaoAPI("GET");
    chamadosArr = resposta && Array.isArray(resposta.dados) ? resposta.dados : [];
    renderizarChamados();
  } catch (erro) {
    mostrarFalhaNaLista(erro.message);
  }
}

function abrirConexao() {
  limparErro(erroConexao);
  if (!campoToken.value && TOKEN_PADRAO) {
    campoToken.value = TOKEN_PADRAO;
  }
  botaoDesconectar.hidden = modoAtual !== "api";
  abrirDialog(dialogConexao);
}

async function conectarAPI(evento) {
  evento.preventDefault();
  limparErro(erroConexao);

  let tokenDigitado = campoToken.value.trim();
  if (!/^[a-fA-F0-9]{64}$/.test(tokenDigitado)) {
    mostrarErro(erroConexao, "O token deve conter exatamente 64 caracteres hexadecimais.");
    campoToken.focus();
    return;
  }

  token = tokenDigitado;
  botaoEnviarToken.disabled = true;
  botaoEnviarToken.textContent = "Conectando...";

  try {
    let resposta = await requisicaoAPI("GET");
    chamadosArr = resposta && Array.isArray(resposta.dados) ? resposta.dados : [];
    definirModo("api");
    fecharDialog(dialogConexao);
    renderizarChamados();
    mostrarNotificacao("Conexão realizada com sucesso!");
  } catch (erro) {
    token = "";
    mostrarErro(erroConexao, erro.message);
  } finally {
    botaoEnviarToken.disabled = false;
    botaoEnviarToken.textContent = "Conectar";
  }
}

function desconectarAPI() {
  token = "";
  chamadosArr = [];
  campoToken.value = "";
  definirModo("offline");
  fecharDialog(dialogConexao);
  limparErro(erroLista);
  renderizarChamados();
  mostrarNotificacao("Você desconectou da API.");
}

function ativarDemonstracao() {
  token = "";
  chamadosArr = dadosDemonstracao.map(function (chamado) {
    return { ...chamado };
  });
  definirModo("demo");
  limparFiltros();
  renderizarChamados();
  mostrarNotificacao("Modo demonstração ativado. Os dados não serão enviados à API.");
}

function limparFiltros() {
  campoBuscar.value = "";
  filtroStatus.value = "";
  filtroPrioridade.value = "";
  renderizarChamados();
}

function abrirFormulario(chamado = null) {
  if (modoAtual === "offline") {
    mostrarNotificacao("Conecte-se à API ou abra a demonstração para cadastrar chamados.");
    abrirConexao();
    return;
  }

  chamadoEmEdicao = chamado ? chamado.id : null;
  limparErro(erroFormulario);
  formChamado.reset();
  campoTitulo.removeAttribute("aria-invalid");
  campoDescricao.removeAttribute("aria-invalid");
  campoCategoria.removeAttribute("aria-invalid");
  campoPrioridade.removeAttribute("aria-invalid");

  if (chamado) {
    tituloFormulario.textContent = "Editar chamado";
    botaoSalvarChamado.textContent = "Salvar alterações";
    campoTitulo.value = chamado.titulo || "";
    campoDescricao.value = chamado.descricao || "";
    campoCategoria.value = chamado.categoria || "";
    campoPrioridade.value = chamado.prioridade || "";
    campoStatus.value = chamado.status || "aberto";
    campoStatus.disabled = false;
    rotuloCampoStatus.hidden = false;
  } else {
    tituloFormulario.textContent = "Novo chamado";
    botaoSalvarChamado.textContent = "Criar chamado";
    campoStatus.value = "aberto";
    campoStatus.disabled = true;
    rotuloCampoStatus.hidden = true;
  }

  atualizarContadorDescricao();
  fecharDialog(dialogDetalhe);
  abrirDialog(dialogFormulario);
}

async function buscarChamadoPorId(id) {
  if (modoAtual === "demo") {
    let chamadoDemo = chamadosArr.find(function (item) {
      return String(item.id) === String(id);
    });

    if (!chamadoDemo) {
      throw new Error("Chamado não encontrado.");
    }

    return { ...chamadoDemo };
  }

  let resposta = await requisicaoAPI("GET", id);
  if (!resposta || !resposta.dados) {
    throw new Error("A API não retornou os dados do chamado.");
  }
  return resposta.dados;
}

async function abrirDetalhe(id) {
  abrirDialog(dialogDetalhe);
  carregandoDetalhe.hidden = false;
  dadosDetalhe.hidden = true;
  limparErro(erroDetalhe);
  botaoEditarDetalhe.hidden = true;
  numeroDetalhe.textContent = `Chamado #${id}`;
  tituloDetalhe.textContent = "Carregando...";

  try {
    chamadoEmDetalhe = await buscarChamadoPorId(id);
    tituloDetalhe.textContent = chamadoEmDetalhe.titulo;
    numeroDetalhe.textContent = `Chamado #${chamadoEmDetalhe.id}`;
    definirEtiqueta(statusDetalhe, chamadoEmDetalhe.status, "status");
    definirEtiqueta(prioridadeDetalhe, chamadoEmDetalhe.prioridade, "prioridade");
    descricaoDetalhe.textContent = chamadoEmDetalhe.descricao || "Nenhuma descrição informada.";
    categoriaDetalhe.textContent = rotulos.categoria[chamadoEmDetalhe.categoria] || chamadoEmDetalhe.categoria;
    criadoDetalhe.textContent = formatarData(chamadoEmDetalhe.criado_em);
    atualizadoDetalhe.textContent = formatarData(chamadoEmDetalhe.atualizado_em);
    carregandoDetalhe.hidden = true;
    dadosDetalhe.hidden = false;
    botaoEditarDetalhe.hidden = false;
  } catch (erro) {
    carregandoDetalhe.hidden = true;
    mostrarErro(erroDetalhe, erro.message);
  }
}

function atualizarContadorDescricao() {
  tamanhoDescricao.textContent = `${campoDescricao.value.length.toLocaleString("pt-BR")} / 2.000`;
}

function validarCamposChamado() {
  let titulo = campoTitulo.value.trim();
  let descricao = campoDescricao.value;
  let valido = true;

  campoTitulo.removeAttribute("aria-invalid");
  campoDescricao.removeAttribute("aria-invalid");
  campoCategoria.removeAttribute("aria-invalid");
  campoPrioridade.removeAttribute("aria-invalid");
  limparErro(erroFormulario);

  if (titulo.length < 1 || titulo.length > 150) {
    campoTitulo.setAttribute("aria-invalid", "true");
    mostrarErro(erroFormulario, "Informe um título com 1 a 150 caracteres.");
    campoTitulo.focus();
    valido = false;
  } else if (descricao.length > 2000) {
    campoDescricao.setAttribute("aria-invalid", "true");
    mostrarErro(erroFormulario, "A descrição deve ter no máximo 2.000 caracteres.");
    campoDescricao.focus();
    valido = false;
  } else if (!Object.prototype.hasOwnProperty.call(rotulos.categoria, campoCategoria.value)) {
    campoCategoria.setAttribute("aria-invalid", "true");
    mostrarErro(erroFormulario, "Selecione uma categoria válida.");
    campoCategoria.focus();
    valido = false;
  } else if (!Object.prototype.hasOwnProperty.call(rotulos.prioridade, campoPrioridade.value)) {
    campoPrioridade.setAttribute("aria-invalid", "true");
    mostrarErro(erroFormulario, "Selecione uma prioridade válida.");
    campoPrioridade.focus();
    valido = false;
  } else if (chamadoEmEdicao !== null && !Object.prototype.hasOwnProperty.call(rotulos.status, campoStatus.value)) {
    campoStatus.setAttribute("aria-invalid", "true");
    mostrarErro(erroFormulario, "Selecione um status válido.");
    campoStatus.focus();
    valido = false;
  }

  return valido;
}

async function salvarChamado(evento) {
  evento.preventDefault();

  if (!validarCamposChamado()) {
    return;
  }

  let dadosChamado = {
    titulo: campoTitulo.value.trim(),
    descricao: campoDescricao.value.trim(),
    categoria: campoCategoria.value,
    prioridade: campoPrioridade.value
  };

  botaoSalvarChamado.disabled = true;
  botaoSalvarChamado.textContent = "Salvando...";

  try {
    if (chamadoEmEdicao === null) {
      if (modoAtual === "api") {
        // No cadastro, o status é omitido para a API iniciar o chamado como "aberto".
        await requisicaoAPI("POST", null, dadosChamado);
      } else {
        let novoChamado = {
          ...dadosChamado,
          id: `demo-${Date.now()}`,
          status: "aberto",
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        };
        chamadosArr.unshift(novoChamado);
      }
      fecharDialog(dialogFormulario);
      renderizarChamados();
      mostrarNotificacao("Chamado criado com sucesso!");
    } else {
      dadosChamado.status = campoStatus.value;

      if (modoAtual === "api") {
        await requisicaoAPI("PUT", chamadoEmEdicao, dadosChamado);
      } else {
        let indice = chamadosArr.findIndex(function (chamado) {
          return String(chamado.id) === String(chamadoEmEdicao);
        });
        if (indice === -1) {
          throw new Error("Chamado não encontrado.");
        }
        chamadosArr[indice] = {
          ...chamadosArr[indice],
          ...dadosChamado,
          atualizado_em: new Date().toISOString()
        };
      }
      fecharDialog(dialogFormulario);
      renderizarChamados();
      mostrarNotificacao("Chamado atualizado com sucesso!");
    }

    if (modoAtual === "api") {
      await atualizarChamados();
    }
  } catch (erro) {
    mostrarErro(erroFormulario, erro.message);
  } finally {
    botaoSalvarChamado.disabled = false;
    botaoSalvarChamado.textContent = chamadoEmEdicao === null ? "Criar chamado" : "Salvar alterações";
  }
}

function abrirConfirmacaoExclusao(id) {
  let chamado = chamadosArr.find(function (item) {
    return String(item.id) === String(id);
  });

  if (!chamado) {
    mostrarNotificacao("Não foi possível localizar esse chamado.");
    return;
  }

  chamadoParaExcluir = chamado.id;
  nomeExclusao.textContent = chamado.titulo;
  limparErro(erroExclusao);
  abrirDialog(dialogExclusao);
}

async function excluirChamado() {
  if (chamadoParaExcluir === null) {
    return;
  }

  botaoConfirmarExclusao.disabled = true;
  botaoConfirmarExclusao.textContent = "Excluindo...";

  try {
    if (modoAtual === "api") {
      await requisicaoAPI("DELETE", chamadoParaExcluir);
    } else {
      chamadosArr = chamadosArr.filter(function (chamado) {
        return String(chamado.id) !== String(chamadoParaExcluir);
      });
    }

    fecharDialog(dialogExclusao);
    chamadoParaExcluir = null;
    renderizarChamados();
    mostrarNotificacao("Chamado excluído com sucesso!");

    if (modoAtual === "api") {
      await atualizarChamados();
    }
  } catch (erro) {
    mostrarErro(erroExclusao, erro.message);
  } finally {
    botaoConfirmarExclusao.disabled = false;
    botaoConfirmarExclusao.textContent = "Excluir chamado";
  }
}

// Eventos dos botões e formulários
botaoConectar.addEventListener("click", abrirConexao);
botaoVazioConectar.addEventListener("click", abrirConexao);
botaoNovoChamado.addEventListener("click", function () {
  abrirFormulario();
});
botaoVazioNovo.addEventListener("click", function () {
  abrirFormulario();
});
botaoAtualizar.addEventListener("click", atualizarChamados);
botaoDemonstrar.addEventListener("click", ativarDemonstracao);
botaoTentarNovamente.addEventListener("click", atualizarChamados);
botaoDesconectar.addEventListener("click", desconectarAPI);
formConexao.addEventListener("submit", conectarAPI);
formChamado.addEventListener("submit", salvarChamado);
botaoConfirmarExclusao.addEventListener("click", excluirChamado);

campoBuscar.addEventListener("input", renderizarChamados);
filtroStatus.addEventListener("change", renderizarChamados);
filtroPrioridade.addEventListener("change", renderizarChamados);
campoDescricao.addEventListener("input", atualizarContadorDescricao);
botaoLimparFiltros.addEventListener("click", limparFiltros);
botaoLimparFiltrosRodape.addEventListener("click", limparFiltros);

botaoEditarDetalhe.addEventListener("click", function () {
  if (chamadoEmDetalhe) {
    abrirFormulario(chamadoEmDetalhe);
  }
});

listaChamados.addEventListener("click", function (evento) {
  let botao = evento.target.closest("[data-acao]");
  if (!botao) {
    return;
  }

  let id = botao.dataset.id;
  let acao = botao.dataset.acao;

  if (acao === "detalhar") {
    abrirDetalhe(id);
  } else if (acao === "editar") {
    buscarChamadoPorId(id)
      .then(function (chamado) {
        abrirFormulario(chamado);
      })
      .catch(function (erro) {
        mostrarNotificacao(erro.message);
      });
  } else if (acao === "excluir") {
    abrirConfirmacaoExclusao(id);
  }
});

document.querySelectorAll("[data-fechar]").forEach(function (botao) {
  botao.addEventListener("click", function () {
    fecharDialog(botao.closest("dialog"));
  });
});

document.querySelectorAll("dialog").forEach(function (dialog) {
  dialog.addEventListener("click", function (evento) {
    if (evento.target === dialog) {
      fecharDialog(dialog);
    }
  });
});

// Limites também são aplicados pelo JavaScript, além da validação antes do envio.
campoTitulo.maxLength = 150;
campoDescricao.maxLength = 2000;

// Deixa o token fornecido disponível no formulário de conexão.
campoToken.value = TOKEN_PADRAO;

// Estado inicial da aplicação.
definirModo("offline");
renderizarChamados();
atualizarContadorDescricao();
