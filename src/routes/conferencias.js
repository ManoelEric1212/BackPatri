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
    localVerificado,
    pertence,
  });
});

module.exports = router;
