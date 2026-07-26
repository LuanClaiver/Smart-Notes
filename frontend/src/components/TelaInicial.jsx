function TelaInicial({ notas, temaEscuro, usuario, abrirAba, abrirNovaNota }) {
  const abas = [
    {
      id: 'minhas',
      titulo: 'Minhas notas',
      subtitulo: 'Privadas, pessoais e compartilhadas criadas por você',
      icone: '🗂️',
      valor: notas.filter((nota) => nota.minhaNota && !nota.naLixeira).length
    },
    {
      id: 'compartilhadas',
      titulo: 'Comunidade',
      subtitulo: 'Notas compartilhadas entre os usuários do app',
      icone: '🤝',
      valor: notas.filter((nota) => nota.compartilhada && !nota.naLixeira).length
    },
    {
      id: 'favoritas',
      titulo: 'Favoritas',
      subtitulo: 'Somente as notas que você favoritou',
      icone: '❤️',
      valor: notas.filter((nota) => nota.favorita && !nota.naLixeira).length
    },
    {
      id: 'lixeira',
      titulo: 'Lixeira',
      subtitulo: 'Notas removidas ficam separadas daqui',
      icone: '🗑️',
      valor: notas.filter((nota) => nota.naLixeira).length,
      menor: true
    }
  ];

  return (
    <section className='animate-fade-in space-y-6'>
      <div className={`rounded-[2.25rem] border overflow-hidden shadow-2xl ${temaEscuro ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className='p-6 md:p-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6'>
          <div className='min-w-0'>
            <span className='text-xs uppercase tracking-[0.28em] text-emerald-500 font-black'>Tela inicial</span>
            <h2 className='text-3xl md:text-5xl font-black mt-3 leading-tight'>Olá{usuario?.nome ? `, ${usuario.nome}` : ''}. Escolha uma área para começar.</h2>
            <p className='text-sm md:text-base text-slate-400 mt-4 max-w-4xl leading-relaxed'>Suas notas ficam separadas por área para não virar um amontoado na tela inicial. Entre em uma aba para pesquisar, filtrar e organizar do jeito certo.</p>
          </div>

          <button
            type='button'
            onClick={abrirNovaNota}
            className='w-full sm:w-auto shrink-0 px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5'
          >
            + Criar nova nota
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_1.2fr_0.8fr] gap-4'>
        {abas.map((aba) => (
          <button
            key={aba.id}
            onClick={() => abrirAba(aba.id)}
            className={`text-left rounded-[1.75rem] border p-5 shadow-xl transition-all hover:-translate-y-1 ${
              aba.id === 'lixeira'
                ? temaEscuro ? 'bg-slate-900/70 border-red-900/50 hover:border-red-500/70' : 'bg-white border-red-200 hover:border-red-400'
                : temaEscuro ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/60' : 'bg-white border-slate-200 hover:border-emerald-500/60'
            }`}
          >
            <div className='flex items-center justify-between gap-3'>
              <span className={aba.menor ? 'text-2xl' : 'text-3xl'}>{aba.icone}</span>
              <strong className={aba.menor ? 'text-2xl' : 'text-3xl'}>{aba.valor}</strong>
            </div>
            <h3 className='mt-4 text-lg font-black'>{aba.titulo}</h3>
            <p className='text-xs md:text-sm opacity-75 mt-1 leading-relaxed'>{aba.subtitulo}</p>
            <span className='inline-block mt-5 text-sm font-black text-emerald-500'>Abrir tela →</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default TelaInicial;
