import { Link } from 'react-router-dom';

function Home() {
  return (
    <div>
      <h1>C4Diagrams</h1>
      <p>Ferramenta de modelagem de diagramas C4.</p>
      <nav>
        <Link to="/cadastro">Cadastro</Link>
        {' | '}
        <Link to="/login">Login</Link>
      </nav>
    </div>
  );
}

export default Home;