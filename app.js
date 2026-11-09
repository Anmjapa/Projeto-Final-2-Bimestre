"use strict";

const porId = (id) => document.getElementById(id);

const CATEGORIAS = { hardware: "Hardware", software: "Software", rede: "Rede", outro: "Outro" };
const PRIORIDADES = { baixa: "Baixa", media: "Média", alta: "Alta" };
const STATUS = { aberto: "Aberto", em_andamento: "Em andamento", concluido: "Concluído" };

const estado = {
  cliente: null,
  chamados: [],
  ocupado: false,
  carregandoLista: false,
  erroLista: "",
  editandoId: null,
  detalhe: null,
  chamadoParaExcluir: null,
};

const filtros = {
  titulo: porId("buscar"),
  status: porId("filtrar-status"),
  prioridade: porId("filtrar-prioridade"),
};
const campos = {
  titulo: porId("campo-titulo"),
  descricao: porId("campo-descricao"),
  categoria: porId("campo-categoria"),
  prioridade: porId("campo-prioridade"),
  status: porId("campo-status"),
};
const dialogConexao = porId("dialog-conexao");
const dialogDetalhe = porId("dialog-detalhe");
const dialogFormulario = porId("dialog-formulario");
const dialogExclusao = porId("dialog-exclusao");
const dataCurta = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const dataCompleta = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const numero = new Intl.NumberFormat("pt-BR");
let temporizadorNotificacao;

function atualizarControles() {
  const conectado = Boolean(estado.cliente);
  document.querySelectorAll("[data-ocupado]").forEach((controle) => {
    controle.disabled = estado.ocupado;
  });
  Object.values(filtros).forEach((filtro) => { filtro.disabled = !conectado; });
  porId("atualizar").disabled = estado.ocupado || !conectado;
}

async function executar(acao, emCasoDeErro, progresso) {
  if (estado.ocupado) return;

  const foco = document.activeElement;
  const textoOriginal = progresso?.botao.textContent;
  if (progresso) progresso.botao.textContent = progresso.rotulo;
  estado.ocupado = true;
  atualizarControles();

  try {
    await acao();
  } catch (erro) {
    emCasoDeErro(erro);
  } finally {
    estado.ocupado = false;
    if (progresso) progresso.botao.textContent = textoOriginal;
    atualizarControles();
    if (document.activeElement === document.body && foco.isConnected && !foco.closest("dialog:not([open])")) {
      foco.focus();
    }
  }
}

function mensagemDeErro(erro) {
  if (!(erro instanceof ErroApi)) return erro.message;
  const detalhes = Object.values(erro.campos).filter((valor) => typeof valor === "string");
  return ["HTTP " + erro.status + " · " + erro.message, ...detalhes].join(" ");
}

function mostrarErro(id, mensagem = "") {
  const caixa = porId(id);
  caixa.textContent = mensagem;
  caixa.hidden = !mensagem;
}

function notificar(mensagem) {
  const caixa = porId("notificacao");
  clearTimeout(temporizadorNotificacao);
  caixa.textContent = mensagem;
  temporizadorNotificacao = setTimeout(() => { caixa.textContent = ""; }, 4800);
}

function textoParaBusca(texto) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function numeroChamado(id) {
  return "#" + String(id).padStart(4, "0");
}

function formatarData(valor, formatador) {
  // A API informa data e hora sem fuso, no formato AAAA-MM-DD HH:MM:SS.
  const data = new Date(String(valor).replace(" ", "T"));
  return Number.isNaN(data.getTime()) ? "—" : formatador.format(data);
}

function preencherEtiqueta(etiqueta, valor, rotulos) {
  etiqueta.dataset.valor = valor;
  etiqueta.textContent = rotulos[valor] ?? "—";
}

function montarLinha(chamado) {
  const linha = porId("modelo-linha").content.firstElementChild.cloneNode(true);
  linha.dataset.id = chamado.id;
  linha.querySelector(".link-chamado").textContent = chamado.titulo;
  linha.querySelector(".numero-chamado").textContent = numeroChamado(chamado.id);
  linha.querySelector(".celula-categoria").textContent = CATEGORIAS[chamado.categoria] ?? "—";
  preencherEtiqueta(linha.querySelector(".celula-prioridade .etiqueta"), chamado.prioridade, PRIORIDADES);
  preencherEtiqueta(linha.querySelector(".celula-status .etiqueta"), chamado.status, STATUS);
  const data = linha.querySelector("time");
  data.textContent = formatarData(chamado.criado_em, dataCurta);
  data.dateTime = String(chamado.criado_em).replace(" ", "T");
  linha.querySelector('[data-acao="editar"]').setAttribute("aria-label", "Editar chamado " + numeroChamado(chamado.id));
  linha.querySelector('[data-acao="excluir"]').setAttribute("aria-label", "Excluir chamado " + numeroChamado(chamado.id));
  return linha;
}

function renderizarEstadoVazio(filtrosAtivos) {
  let modo = "sem-chamados";
  if (!estado.cliente) modo = "offline";
  else if (estado.erroLista && !estado.chamados.length) modo = "erro";
  else if (filtrosAtivos) modo = "filtrado";

  const mensagens = {
    offline: ["Conecte-se para ver seus chamados", "Use o token da atividade ou explore a interface com dados de exemplo."],
    erro: ["Não foi possível carregar os chamados", "Tente carregar a lista novamente."],
    filtrado: ["Nenhum chamado encontrado", "Altere a pesquisa ou limpe os filtros para ver mais resultados."],
    "sem-chamados": ["Nenhum chamado cadastrado", "Crie uma solicitação para começar a acompanhar seu atendimento."],
  };
  const [titulo, descricao] = mensagens[modo];
  porId("vazio-titulo").textContent = titulo;
  porId("vazio-descricao").textContent = descricao;
  porId("vazio-conectar").hidden = modo !== "offline";
  porId("demonstrar").hidden = modo !== "offline";
  porId("vazio-novo").hidden = modo !== "sem-chamados";
  porId("limpar-filtros").hidden = modo !== "filtrado";
  porId("tentar-novamente").hidden = modo !== "erro";
}

function renderizarLista() {
  const titulo = textoParaBusca(filtros.titulo.value);
  const status = filtros.status.value;
  const prioridade = filtros.prioridade.value;
  const filtrosAtivos = Boolean(titulo || status || prioridade);
  const visiveis = estado.chamados.filter((chamado) =>
    (!titulo || textoParaBusca(chamado.titulo).includes(titulo)) &&
    (!status || chamado.status === status) &&
    (!prioridade || chamado.prioridade === prioridade)
  );

  const mostrarTabela = !estado.carregandoLista && visiveis.length > 0;
  porId("resultado-lista").setAttribute("aria-busy", String(estado.carregandoLista));
  porId("carregando-lista").hidden = !estado.carregandoLista;
  porId("envoltoria-tabela").hidden = !mostrarTabela;
  porId("rodape-lista").hidden = !mostrarTabela;
  porId("lista-vazia").hidden = estado.carregandoLista || mostrarTabela;
  mostrarErro("erro-lista", estado.erroLista);

  const linhas = document.createDocumentFragment();
  if (mostrarTabela) {
    visiveis.forEach((chamado) => linhas.append(montarLinha(chamado)));
    const contagem = numero.format(visiveis.length);
    porId("contagem").textContent = filtrosAtivos
      ? contagem + " de " + numero.format(estado.chamados.length) + " chamados"
      : contagem + (visiveis.length === 1 ? " chamado" : " chamados");
  }
  porId("lista-chamados").replaceChildren(linhas);
  porId("limpar-filtros-rodape").hidden = !filtrosAtivos;
  renderizarEstadoVazio(filtrosAtivos);
  atualizarControles();
}

function renderizar() {
  const modo = estado.cliente?.modo ?? "offline";
  const indicador = porId("indicador-conexao");
  indicador.dataset.modo = modo;
  indicador.textContent = { offline: "Sem conexão", api: "API conectada", demo: "Demonstração" }[modo];
  porId("conectar").querySelector("span").textContent = modo === "api" ? "Conexão" : "Conectar API";

  const totais = { aberto: 0, em_andamento: 0, concluido: 0 };
  for (const chamado of estado.chamados) {
    if (Object.hasOwn(totais, chamado.status)) totais[chamado.status] += 1;
  }
  porId("total").textContent = estado.cliente ? numero.format(estado.chamados.length) : "—";
  for (const [status, total] of Object.entries(totais)) {
    porId("total-" + status.replace("_", "-")).textContent = estado.cliente ? numero.format(total) : "—";
  }
  renderizarLista();
}

function zerarFiltros() {
  Object.values(filtros).forEach((filtro) => { filtro.value = ""; });
}

function limparFiltros() {
  zerarFiltros();
  renderizarLista();
  filtros.titulo.focus();
}

async function iniciarSessao(cliente) {
  // Só substitui os dados visíveis depois que a nova sessão for validada.
  const chamados = await cliente.listar();
  estado.cliente = cliente;
  estado.chamados = chamados;
  estado.erroLista = "";
  zerarFiltros();
  renderizar();
}

function abrirConexao() {
  porId("form-conexao").reset();
  porId("token").removeAttribute("aria-invalid");
  mostrarErro("erro-conexao");
  porId("desconectar").hidden = !estado.cliente;
  dialogConexao.showModal();
}

porId("form-conexao").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const campo = porId("token");
  const token = campo.value.trim();

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    campo.setAttribute("aria-invalid", "true");
    mostrarErro("erro-conexao", "O token deve ter 64 caracteres hexadecimais.");
    campo.focus();
    return;
  }

  mostrarErro("erro-conexao");
  executar(async () => {
    await iniciarSessao(conectarClienteApi(token));
    dialogConexao.close();
    notificar("API conectada. Seus chamados foram carregados.");
  }, (erro) => {
    if (erro.status === 401) campo.setAttribute("aria-invalid", "true");
    mostrarErro("erro-conexao", mensagemDeErro(erro));
  }, { botao: porId("enviar-token"), rotulo: "Conectando…" });
});

porId("token").addEventListener("input", () => {
  porId("token").removeAttribute("aria-invalid");
  mostrarErro("erro-conexao");
});
dialogConexao.addEventListener("close", () => { porId("form-conexao").reset(); });

porId("desconectar").addEventListener("click", () => {
  estado.cliente = null;
  estado.chamados = [];
  estado.detalhe = null;
  estado.chamadoParaExcluir = null;
  estado.erroLista = "";
  zerarFiltros();
  dialogConexao.close();
  renderizar();
  notificar("Sessão desconectada.");
});

porId("demonstrar").addEventListener("click", () => {
  executar(async () => {
    await iniciarSessao(criarClienteDemonstracao());
    notificar("Demonstração iniciada. As alterações valem para esta sessão.");
  }, (erro) => {
    estado.erroLista = mensagemDeErro(erro);
    renderizarLista();
  });
});

async function recarregarLista() {
  if (!estado.cliente) return;

  await executar(async () => {
    estado.carregandoLista = true;
    estado.erroLista = "";
    renderizarLista();

    try {
      estado.chamados = await estado.cliente.listar();
      notificar("Lista atualizada.");
    } finally {
      estado.carregandoLista = false;
    }
  }, (erro) => { estado.erroLista = mensagemDeErro(erro); });

  renderizar();
}

function mostrarDetalhe(chamado) {
  porId("titulo-detalhe").textContent = chamado.titulo;
  preencherEtiqueta(porId("status-detalhe"), chamado.status, STATUS);
  preencherEtiqueta(porId("prioridade-detalhe"), chamado.prioridade, PRIORIDADES);
  porId("descricao-detalhe").textContent = chamado.descricao || "Sem descrição.";
  porId("categoria-detalhe").textContent = CATEGORIAS[chamado.categoria] ?? "—";
  porId("criado-detalhe").textContent = formatarData(chamado.criado_em, dataCompleta);
  porId("atualizado-detalhe").textContent = formatarData(chamado.atualizado_em, dataCompleta);
  porId("dados-detalhe").hidden = false;
  porId("editar-detalhe").hidden = false;
}

async function carregarDetalhe(chamado, editarDepois = false) {
  estado.detalhe = null;
  porId("numero-detalhe").textContent = "Chamado " + numeroChamado(chamado.id);
  porId("titulo-detalhe").textContent = chamado.titulo;
  porId("carregando-detalhe").hidden = false;
  porId("dados-detalhe").hidden = true;
  porId("editar-detalhe").hidden = true;
  mostrarErro("erro-detalhe");
  dialogDetalhe.showModal();

  await executar(async () => {
    estado.detalhe = await estado.cliente.detalhar(chamado.id);
    if (editarDepois) {
      dialogDetalhe.close();
      abrirFormulario(estado.detalhe);
    } else {
      mostrarDetalhe(estado.detalhe);
    }
  }, (erro) => { mostrarErro("erro-detalhe", mensagemDeErro(erro)); });

  porId("carregando-detalhe").hidden = true;
  if (editarDepois && dialogFormulario.open) campos.titulo.focus();
}

function atualizarContador() {
  porId("tamanho-descricao").textContent = numero.format([...campos.descricao.value].length) + " / 2.000";
}

function abrirFormulario(chamado) {
  const editando = Boolean(chamado);
  estado.editandoId = chamado?.id ?? null;
  porId("form-chamado").reset();
  Object.entries(campos).forEach(([nome, campo]) => {
    if (editando) campo.value = chamado[nome] ?? "";
    campo.removeAttribute("aria-invalid");
  });
  porId("rotulo-campo-status").hidden = !editando;
  campos.status.disabled = !editando;
  porId("titulo-formulario").textContent = editando ? "Editar chamado" : "Novo chamado";
  porId("salvar-chamado").textContent = editando ? "Salvar alterações" : "Criar chamado";
  mostrarErro("erro-formulario");
  atualizarContador();
  dialogFormulario.showModal();
}

function abrirNovoChamado() {
  if (estado.cliente) abrirFormulario();
  else abrirConexao();
}

function validarFormulario() {
  const tamanhoTitulo = [...campos.titulo.value.trim()].length;
  if (tamanhoTitulo === 0 || tamanhoTitulo > 150) {
    campos.titulo.setAttribute("aria-invalid", "true");
    mostrarErro("erro-formulario", "Informe um título com 1 a 150 caracteres.");
    campos.titulo.focus();
    return false;
  }
  if ([...campos.descricao.value].length > 2000) {
    campos.descricao.setAttribute("aria-invalid", "true");
    mostrarErro("erro-formulario", "A descrição deve ter até 2.000 caracteres.");
    campos.descricao.focus();
    return false;
  }
  return true;
}

porId("form-chamado").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!validarFormulario()) return;

  const id = estado.editandoId;
  const editando = id !== null;
  const dados = {
    titulo: campos.titulo.value.trim(),
    descricao: campos.descricao.value,
    categoria: campos.categoria.value,
    prioridade: campos.prioridade.value,
  };
  if (editando) dados.status = campos.status.value;
  mostrarErro("erro-formulario");

  await executar(async () => {
    if (editando) {
      const atualizado = await estado.cliente.editar(id, dados);
      estado.chamados = estado.chamados.map((chamado) => chamado.id === id ? atualizado : chamado);
    } else {
      const criado = await estado.cliente.criar(dados);
      estado.chamados = [criado, ...estado.chamados];
    }
    estado.erroLista = "";
    dialogFormulario.close();
    renderizar();
    notificar(editando ? "Chamado atualizado." : "Chamado criado com sucesso.");
  }, (erro) => {
    Object.keys(erro.campos ?? {}).forEach((nome) => { campos[nome]?.setAttribute("aria-invalid", "true"); });
    mostrarErro("erro-formulario", mensagemDeErro(erro));
  }, { botao: porId("salvar-chamado"), rotulo: "Salvando…" });
});

Object.values(campos).forEach((campo) => {
  campo.addEventListener("input", () => { campo.removeAttribute("aria-invalid"); });
});
campos.descricao.addEventListener("input", atualizarContador);

function abrirExclusao(chamado) {
  estado.chamadoParaExcluir = chamado;
  porId("nome-exclusao").textContent = "“" + chamado.titulo + "”";
  mostrarErro("erro-exclusao");
  dialogExclusao.showModal();
}

porId("confirmar-exclusao").addEventListener("click", () => {
  const id = estado.chamadoParaExcluir.id;
  executar(async () => {
    await estado.cliente.excluir(id);
    estado.chamados = estado.chamados.filter((chamado) => chamado.id !== id);
    estado.erroLista = "";
    dialogExclusao.close();
    renderizar();
    notificar("Chamado excluído.");
  }, (erro) => { mostrarErro("erro-exclusao", mensagemDeErro(erro)); },
  { botao: porId("confirmar-exclusao"), rotulo: "Excluindo…" });
});

porId("lista-chamados").addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao || estado.ocupado) return;

  const id = botao.closest("tr").dataset.id;
  const chamado = estado.chamados.find((item) => String(item.id) === id);
  if (!chamado) return;

  if (botao.dataset.acao === "excluir") abrirExclusao(chamado);
  else carregarDetalhe(chamado, botao.dataset.acao === "editar");
});

porId("editar-detalhe").addEventListener("click", () => {
  dialogDetalhe.close();
  abrirFormulario(estado.detalhe);
});

document.querySelectorAll("[data-fechar]").forEach((botao) => {
  botao.addEventListener("click", () => { botao.closest("dialog").close(); });
});
document.querySelectorAll("dialog").forEach((dialogo) => {
  dialogo.addEventListener("cancel", (evento) => {
    if (estado.ocupado) evento.preventDefault();
  });
});

porId("conectar").addEventListener("click", abrirConexao);
porId("vazio-conectar").addEventListener("click", abrirConexao);
porId("novo-chamado").addEventListener("click", abrirNovoChamado);
porId("vazio-novo").addEventListener("click", abrirNovoChamado);
porId("atualizar").addEventListener("click", recarregarLista);
porId("tentar-novamente").addEventListener("click", recarregarLista);
porId("limpar-filtros").addEventListener("click", limparFiltros);
porId("limpar-filtros-rodape").addEventListener("click", limparFiltros);
filtros.titulo.addEventListener("input", renderizarLista);
filtros.status.addEventListener("change", renderizarLista);
filtros.prioridade.addEventListener("change", renderizarLista);

renderizar();
