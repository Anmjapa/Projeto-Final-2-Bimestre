// Central de Chamados - Fatec Lins
// Toda a aplicação (interface + comunicação com a API) fica neste arquivo.

const API_URL = "https://felipemaciel.com.br/_fatec/api/central-chamados/chamados";
const TOKEN = "fd17edc7c76c9779bfa4f584ca1d19068c02059eec22bd0290423608ee4d5f7a";

let conectado = false;
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


// Elementos da página
const indicadorConexao = document.querySelector("#indicador-conexao");
const botaoNovoChamado = document.querySelector("#novo-chamado");
const botaoAtualizar = document.querySelector("#atualizar");
const botaoVazioNovo = document.querySelector("#vazio-novo");
const botaoTentarNovamente = document.querySelector("#tentar-novamente");
const botaoLimparFiltros = document.querySelector("#limpar-filtros");
const botaoLimparFiltrosRodape = document.querySelector("#limpar-filtros-rodape");

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
    Authorization: `Bearer ${TOKEN}`
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

function definirConexao(estado) {
  if (estado === "api") {
    conectado = true;
    indicadorConexao.textContent = "Conectado à API";
    indicadorConexao.dataset.modo = "api";
  } else if (estado === "erro") {
    conectado = false;
    indicadorConexao.textContent = "Falha na conexão";
    indicadorConexao.dataset.modo = "erro";
  } else {
    conectado = false;
    indicadorConexao.textContent = "Conectando à API...";
    indicadorConexao.dataset.modo = "conectando";
  }

  campoBuscar.disabled = !conectado;
  filtroStatus.disabled = !conectado;
  filtroPrioridade.disabled = !conectado;
  botaoAtualizar.disabled = !conectado;
  botaoNovoChamado.disabled = !conectado;
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
  definirConexao("erro");
  carregandoLista.hidden = true;
  listaVazia.hidden = false;
  envoltoriaTabela.hidden = true;
  rodapeLista.hidden = true;
  resultadoLista.setAttribute("aria-busy", "false");
  vazioTitulo.textContent = "Não foi possível carregar os chamados";
  vazioDescricao.textContent = "Confira a conexão com a internet e tente novamente.";
  botaoVazioNovo.hidden = true;
  botaoLimparFiltros.hidden = true;
  botaoTentarNovamente.hidden = false;
  mostrarErro(erroLista, mensagem);
}

async function atualizarChamados() {
  mostrarCarregamento();

  try {
    let resposta = await requisicaoAPI("GET");
    chamadosArr = resposta && Array.isArray(resposta.dados) ? resposta.dados : [];
    definirConexao("api");
    renderizarChamados();
  } catch (erro) {
    mostrarFalhaNaLista(erro.message);
  }
}

function limparFiltros() {
  campoBuscar.value = "";
  filtroStatus.value = "";
  filtroPrioridade.value = "";
  renderizarChamados();
}

function abrirFormulario(chamado = null) {
  if (!conectado) {
    mostrarNotificacao("Aguarde a conexão com a API para cadastrar chamados.");
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

  if (!conectado || !validarCamposChamado()) {
    return;
  }

  let dadosChamado = {
    titulo: campoTitulo.value.trim(),
    descricao: campoDescricao.value.trim(),
    categoria: campoCategoria.value,
    prioridade: campoPrioridade.value
  };

  let estavaEditando = chamadoEmEdicao !== null;
  botaoSalvarChamado.disabled = true;
  botaoSalvarChamado.textContent = "Salvando...";

  try {
    if (estavaEditando) {
      dadosChamado.status = campoStatus.value;
      await requisicaoAPI("PUT", chamadoEmEdicao, dadosChamado);
    } else {
      // O status é omitido no cadastro para a API criar o chamado como "aberto".
      await requisicaoAPI("POST", null, dadosChamado);
    }

    fecharDialog(dialogFormulario);
    chamadoEmEdicao = null;
    mostrarNotificacao(estavaEditando
      ? "Chamado atualizado com sucesso!"
      : "Chamado criado com sucesso!");
    await atualizarChamados();
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
  if (chamadoParaExcluir === null || !conectado) {
    return;
  }

  botaoConfirmarExclusao.disabled = true;
  botaoConfirmarExclusao.textContent = "Excluindo...";

  try {
    await requisicaoAPI("DELETE", chamadoParaExcluir);
    fecharDialog(dialogExclusao);
    chamadoParaExcluir = null;
    mostrarNotificacao("Chamado excluído com sucesso!");
    await atualizarChamados();
  } catch (erro) {
    mostrarErro(erroExclusao, erro.message);
  } finally {
    botaoConfirmarExclusao.disabled = false;
    botaoConfirmarExclusao.textContent = "Excluir chamado";
  }
}

// Eventos dos botões e formulários
botaoNovoChamado.addEventListener("click", function () {
  abrirFormulario();
});
botaoVazioNovo.addEventListener("click", function () {
  abrirFormulario();
});
botaoAtualizar.addEventListener("click", atualizarChamados);
botaoTentarNovamente.addEventListener("click", atualizarChamados);
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

// A aplicação já inicia conectando à API com o token fornecido.
definirConexao("conectando");
mostrarCarregamento();
atualizarContadorDescricao();
atualizarChamados();
