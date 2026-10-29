import Modal from '../Modal/Modal';

// Nota: referência dos atalhos do editor (aberta pelo menu de configurações). Os de seleção vêm do React Flow —
// listá-los aqui compensa o arrastar no fundo do canvas, que continua movendo a visão em vez de selecionar.
const SHORTCUT_GROUPS = [
  {
    title: 'Edição',
    items: [
      { action: 'Desfazer', keys: 'Ctrl + Z' },
      { action: 'Refazer', keys: 'Ctrl + Y  ou  Ctrl + Shift + Z' },
      { action: 'Salvar', keys: 'Ctrl + S' },
      { action: 'Excluir selecionados', keys: 'Delete  ou  Backspace' },
      { action: 'Editar elemento ou relação', keys: 'Duplo clique' },
      { action: 'Criar relação', keys: 'Arrastar de um ponto de conexão' },
    ],
  },
  {
    title: 'Seleção e navegação',
    items: [
      { action: 'Selecionar vários (caixa)', keys: 'Shift + arrastar' },
      { action: 'Somar à seleção', keys: 'Ctrl + clique' },
      { action: 'Mover a visão', keys: 'Arrastar o fundo' },
      { action: 'Aproximar ou afastar', keys: 'Roda do mouse' },
    ],
  },
];

function ShortcutsModal({ onClose }) {
  return (
    <Modal title="Atalhos do editor" onClose={onClose} closable>
      <div className="flex flex-col gap-5">
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-xs font-semibold text-text-muted">{group.title}</h3>
            <dl className="divide-y divide-line-subtle rounded-[var(--radius-control)] border border-line-subtle">
              {group.items.map((item) => (
                <div key={item.action} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                  <dt className="text-text-secondary">{item.action}</dt>
                  <dd className="text-right font-mono text-xs whitespace-pre text-text-primary">{item.keys}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}

export default ShortcutsModal;
