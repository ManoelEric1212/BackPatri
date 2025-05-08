const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.post("/", async (req, res) => {
  const { usuario, ambiente, itens } = req.body;

  const conferencia = await prisma.conferencia.create({
    data: {
      usuario,
      ambiente,
      itensConferidos: {
        create: await Promise.all(
          itens.map(async (item) => {
            const ativo = await prisma.relacaoAtivos.findUnique({
              where: { codBem: item.codBem },
            });
            if (!ativo) return null;

            const pertence = ativo.local === item.localVerificado;
            return {
              codBem: item.codBem,
              localVerificado: item.localVerificado,
              pertence,
              localReal: pertence ? null : ativo.local,
            };
          })
        ),
      },
    },
    include: { itensConferidos: true },
  });

  res.json(conferencia);
});

router.get("/:usuario", async (req, res) => {
  const usuario = req.params.usuario;

  const conferencias = await prisma.conferencia.findMany({
    where: { usuario },
    include: { itensConferidos: true },
  });

  res.json(conferencias);
});

router.post("/verificar", async (req, res) => {
  const { codBem, localVerificado } = req.body;

  const ativo = await prisma.relacaoAtivos.findUnique({ where: { codBem } });

  if (!ativo) {
    return res.status(404).json({ error: "Bem não encontrado." });
  }

  const pertence = ativo.local === localVerificado;

  res.json({
    codBem: ativo.codBem,
    descricao: ativo.descricao,
    localCadastrado: ativo.local,
    valorCompra: ativo.valorCompra,
    valorResidual: ativo.valorResidual,
    dataAquisicao: ativo.dataAquisicao,
    grupo: ativo.grupo,
    fabricaProd: ativo.fabricaProd,
    modeloProd: ativo.modeloProd,
    localVerificado,
    pertence,
  });
});

router.post("/verificar/global", async (req, res) => {
  const { codBem } = req.body;

  const ativo = await prisma.relacaoAtivos.findUnique({ where: { codBem } });

  if (!ativo) {
    return res.status(404).json({ error: "Bem não encontrado." });
  }

  res.json({
    codBem: ativo.codBem,
    descricao: ativo.descricao,
    localCadastrado: ativo.local,
    valorCompra: ativo.valorCompra,
    valorResidual: ativo.valorResidual,
    dataAquisicao: ativo.dataAquisicao,
    grupo: ativo.grupo,
    fabricaProd: ativo.fabricaProd,
    modeloProd: ativo.modeloProd,
  });
});

router.post("/verificar/local", async (req, res) => {
  const { local, cods } = req.body;

  if (!local || !Array.isArray(cods)) {
    return res
      .status(400)
      .json({ error: "Dados inválidos. Envie 'local' e um array de 'cods'." });
  }

  try {
    // Bens cadastrados para o local informado
    const bensNoLocal = await prisma.relacaoAtivos.findMany({
      where: { local },
    });

    // Bens com os códigos enviados
    const bensInformados = await prisma.relacaoAtivos.findMany({
      where: {
        codBem: { in: cods },
      },
    });

    const codsNoLocal = bensNoLocal.map((bem) => bem.codBem);
    const codsInformados = new Set(cods);

    // Itens conferidos corretamente
    const conferidos = bensNoLocal.filter((bem) =>
      codsInformados.has(bem.codBem)
    );

    // Itens faltantes no local (deveriam estar, mas não foram enviados)
    const faltantes = bensNoLocal.filter(
      (bem) => !codsInformados.has(bem.codBem)
    );

    // Itens de outro local (foram enviados, mas pertencem a outro local)
    const deOutroLocal = bensInformados.filter((bem) => bem.local !== local);

    // Monta a resposta
    res.json({
      totalInformados: cods.length,
      totalCadastradosNoLocal: codsNoLocal.length,
      conferidos: conferidos.length,
      itensConferidos: conferidos.map((bem) => ({
        codBem: bem.codBem,
        descricao: bem.descricao,
      })),
      faltantes: faltantes.length,
      deOutroLocal: deOutroLocal.map((bem) => ({
        codBem: bem.codBem,
        descricao: bem.descricao,
        localCadastrado: bem.local,
      })),
      itensFaltantes: faltantes.map((bem) => ({
        codBem: bem.codBem,
        descricao: bem.descricao,
      })),
    });
  } catch (error) {
    console.error("Erro ao verificar itens:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

module.exports = router;
