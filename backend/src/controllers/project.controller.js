const projectService = require('../services/project.service');
const { importProject } = require('../services/projectImport.service');
const asyncHandler = require('../middlewares/asyncHandler');

// Nota: só name/description saem do corpo — user_id vem sempre do token (evita mass assignment)
const create = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const project = await projectService.createProject(req.user.id, { name, description });
  res.status(201).json(project);
});

const list = asyncHandler(async (req, res) => {
  const projects = await projectService.listProjects(req.user.id);
  res.status(200).json(projects);
});

const getById = asyncHandler(async (req, res) => {
  const project = await projectService.getProject(req.params.id, req.user.id);
  res.status(200).json(project);
});

const update = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const project = await projectService.updateProject(req.params.id, req.user.id, { name, description });
  res.status(200).json(project);
});

const remove = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.id, req.user.id);
  res.status(204).end();
});

// Nota: RF21/RF15 — cria um projeto novo a partir de um arquivo exportado (ou do exemplo); nunca sobrescreve
const importFromFile = asyncHandler(async (req, res) => {
  const project = await importProject(req.user.id, req.body);
  res.status(201).json(project);
});

module.exports = { create, list, getById, update, remove, importFromFile };
