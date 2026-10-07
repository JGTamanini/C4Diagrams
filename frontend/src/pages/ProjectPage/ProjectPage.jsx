import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppHeader from '../../components/AppHeader/AppHeader';
import Canvas from '../../components/Canvas/Canvas';
import { getProject, InvalidProjectIdError } from '../../services/projects';

// Nota: página mínima do projeto (RF07 - visualização); a Fase 4 evolui esta página para o editor
function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    getProject(id)
      .then((data) => active && setProject(data))
      .catch((err) => {
        if (!active) return;
        // Nota: id fora do formato é rejeitado antes da requisição e equivale a um 404 para o usuário
        const notFound = err instanceof InvalidProjectIdError || err.response?.status === 404;
        setErrorMessage(notFound ? 'Projeto não encontrado.' : 'Não foi possível carregar o projeto.');
      });

    return () => {
      active = false;
    };
  }, [id]);

  const backLink = (
    <Link to="/projetos" className="text-sm text-accent">
      Voltar para meus projetos
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans">
      <AppHeader />

      {!project && !errorMessage && (
        <output className="block p-6 text-sm text-text-secondary">
          Carregando projeto...
        </output>
      )}

      {errorMessage && (
        <div className="p-6 text-center">
          <p role="alert" className="mb-4 text-text-secondary">
            {errorMessage}
          </p>
          {backLink}
        </div>
      )}

      {project && (
        <>
          <section className="border-b border-line px-6 py-4">
            {backLink}
            <h1 className="mt-2 text-2xl font-medium text-text-primary">{project.name}</h1>
            {project.description && <p className="mt-1 text-sm text-text-secondary">{project.description}</p>}
            <p className="mt-2 text-xs text-text-muted">Pré-visualização do editor — a edição de diagramas chega na próxima fase.</p>
          </section>

          <div className="min-h-[480px] flex-1">
            <Canvas />
          </div>
        </>
      )}
    </div>
  );
}

export default ProjectPage;
