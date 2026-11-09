import {useEffect,useState} from 'react';import {Routes,Route,Navigate,Link,useNavigate} from 'react-router-dom';import {Flame,Home,ClipboardList,PlusCircle,Utensils,BarChart3,LogOut,RefreshCw,Plus,Minus,Users} from 'lucide-react';import {supabase,configured} from './lib/supabase';import {brl,date} from './lib/utils';import type {Product,Category,Order,Profile} from './types';

function Login(){const [email,E]=useState(''),[password,P]=useState(''),[error,Err]=useState(''),[busy,B]=useState(false);const nav=useNavigate();async function submit(e:React.FormEvent){e.preventDefault();B(true);Err('');const {error}=await supabase.auth.signInWithPassword({email,password});B(false);if(error)Err('E-mail ou senha inválidos.');else nav('/');}return <div className="login"><form className="loginbox" onSubmit={submit}><div className="logo"><Flame/></div><h1>Espetinho Manager</h1><p>Entre para gerenciar os pedidos.</p><label>E-mail<input type="email" value={email} onChange={e=>E(e.target.value)} required/></label><label>Senha<input type="password" value={password} onChange={e=>P(e.target.value)} required/></label>{error&&<p className="error">{error}</p>}<button className="primary wide" disabled={busy}>{busy?'Entrando...':'Entrar'}</button></form></div>}

function AppShell({
  profile,
  children
}: {
  profile: Profile;
  children: React.ReactNode
}) {
  const nav = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    nav('/login');
  }

  const links = [
    ['/', 'Início', Home],
    ['/pedidos', 'Pedidos', ClipboardList],
    ['/novo', 'Novo', PlusCircle],

    ...(profile.papel === 'administrador'
      ? [
          ['/produtos', 'Produtos', Utensils],
          ['/relatorios', 'Relatórios', BarChart3],
          ['/usuarios', 'Usuários', Users]
        ]
      : [])
  ] as any[];

  return (
    <>
      <header>
        <div className="brand">
          <Flame /> Espetinho <b>Manager</b>
        </div>

        <div className="user">
          {profile.nome} · {profile.papel}

          <button className="ghost" onClick={logout}>
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <main>{children}</main>

      <nav className="bottom">
        {links.map(([to, label, Icon]) => (
          <Link key={to} to={to}>
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
function Dashboard(){const [orders,S]=useState<Order[]>([]),[paid,P]=useState(0);async function load(){const start=new Date();start.setHours(0,0,0,0);const [{data:o},{data:p}]=await Promise.all([supabase.from('pedidos').select('*').gte('criado_em',start.toISOString()).order('criado_em',{ascending:false}),supabase.from('pagamentos').select('valor').eq('status','confirmado').gte('criado_em',start.toISOString())]);S((o||[]) as Order[]);P((p||[]).reduce((s:any,x:any)=>s+Number(x.valor),0));}useEffect(()=>{load()},[]);return <div className="page"><div className="heading"><div><small>VISÃO GERAL</small><h1>Dashboard</h1><p>Resumo do movimento de hoje.</p></div><button className="secondary" onClick={load}><RefreshCw size={16}/> Atualizar</button></div><div className="stats"><Stat label="Pedidos hoje" value={String(orders.length)}/><Stat label="Recebido hoje" value={brl(paid)}/><Stat label="Aguardando" value={String(orders.filter(x=>x.status==='recebido').length)}/><Stat label="Em preparo" value={String(orders.filter(x=>x.status==='em_preparo').length)}/></div><section className="panel"><h2>Pedidos recentes</h2>{orders.length?orders.slice(0,8).map(o=><div className="row" key={o.id}><div><b>Pedido #{o.numero}</b><small>{date(o.criado_em)}</small></div><div><span className={'pill '+o.status}>{labelStatus(o.status)}</span> <b>{brl(o.total)}</b></div></div>):<p className="empty">Nenhum pedido hoje.</p>}</section></div>}
function Stat({label,value}:{label:string;value:string}){return <div className="stat"><small>{label}</small><strong>{value}</strong></div>}
function labelStatus(s:string){return ({recebido:'Recebido',em_preparo:'Em preparo',pronto:'Pronto',entregue:'Entregue',cancelado:'Cancelado'} as any)[s]||s}

function Orders() {
  const [orders, S] = useState<Order[]>([]);
  const [filter, F] = useState('ativos');

  function statusPagamento(o: any) {
    const recebido = (o.pagamentos || [])
      .filter((p: any) => p.status === 'confirmado')
      .reduce((s: number, p: any) => s + Number(p.valor), 0);

    return recebido >= Number(o.total) ? 'Pago' : 'Pagamento pendente';
  }

  async function load() {
    let q = supabase
      .from('pedidos')
      .select('*, pagamentos(valor,status)')
      .order('criado_em', { ascending: false })
      .limit(100);

    if (filter !== 'ativos' &&
        filter !== 'todos' &&
        filter !== 'pagos' &&
        filter !== 'pendentes') {
      q = q.eq('status', filter);
    }

    const { data, error } = await q;

    if (error) {
      alert('Erro ao carregar pedidos: ' + error.message);
      return;
    }

    let resultado = data || [];

    // Calcula quanto foi efetivamente recebido
    const valorRecebido = (o: any) =>
      (o.pagamentos || [])
        .filter((p: any) => p.status === 'confirmado')
        .reduce((s: number, p: any) => s + Number(p.valor), 0);

    // EM ANDAMENTO:
    // Não cancelado e ainda não finalizado (entrega + pagamento).
    if (filter === 'ativos') {
      resultado = resultado.filter(o =>
        o.status !== 'cancelado' &&
        (
          o.status !== 'entregue' ||
          valorRecebido(o) < Number(o.total)
        )
      );
    }

    // PAGOS
    if (filter === 'pagos') {
      resultado = resultado.filter(o =>
        valorRecebido(o) >= Number(o.total)
      );
    }

    // PENDENTES
    if (filter === 'pendentes') {
      resultado = resultado.filter(o =>
        o.status !== 'cancelado' &&
        valorRecebido(o) < Number(o.total)
      );
    }

    S(resultado as Order[]);
  }

  useEffect(() => {
    load();
  }, [filter]);

  useEffect(() => {
    const ch = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        load
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [filter]);

  async function advance(o: Order) {
    const next: any = {
      recebido: 'em_preparo',
      em_preparo: 'pronto',
      pronto: 'entregue'
    };

    if (!next[o.status]) return;

    const { error } = await supabase.rpc(
      'atualizar_status_pedido',
      {
        p_pedido_id: o.id,
        p_novo_status: next[o.status],
        p_motivo: null
      }
    );

    if (error) alert(error.message);
    load();
  }

  async function cancel(o: Order) {
    const reason = prompt('Motivo do cancelamento:');
    if (!reason) return;

    const { error } = await supabase.rpc(
      'atualizar_status_pedido',
      {
        p_pedido_id: o.id,
        p_novo_status: 'cancelado',
        p_motivo: reason
      }
    );

    if (error) alert(error.message);
    load();
  }

  return (
    <div className="page">
      <div className="heading">
        <div>
          <small>ATENDIMENTO</small>
          <h1>Pedidos</h1>
        </div>

        <Link className="primary" to="/novo">
          + Novo
        </Link>
      </div>

      <div className="order-filters">

  <div className="filter-group">
    <small className="filter-title">SITUAÇÃO DO PEDIDO</small>

    <div className="filters">
        {[
          ['ativos', 'Em andamento'],
          ['todos', 'Todos'],
          ['recebido', 'Recebidos'],
          ['em_preparo', 'Em preparo'],
          ['pronto', 'Prontos'],
          ['entregue', 'Entregues'],
          ['cancelado', 'Cancelados']
        ].map(([v, l]) => (
          <button
            className={filter === v ? 'chosen' : ''}
            onClick={() => F(v)}
            key={v}
          >
            {l}
          </button>
        ))}
      </div>
    </div>

    <div className="filter-group">
      <small className="filter-title">SITUAÇÃO DO PAGAMENTO</small>

      <div className="filters">
        {[
          ['pagos', 'Pagos'],
          ['pendentes', 'Pendente de pagamento']
        ].map(([v, l]) => (
          <button
            className={filter === v ? 'chosen' : ''}
            onClick={() => F(v)}
            key={v}
          >
            {l}
          </button>
        ))}
      </div>
    </div>

  </div>

      <section className="panel">
        <h2>Pedidos</h2>

        {orders.length ? (
          orders.map(o => (
            <div className="order" key={o.id}>
              <div className="row">
            <b>Pedido #{o.numero}</b>

            <div className="order-statuses">
              <span className={'pill ' + o.status}>
                {labelStatus(o.status)}
              </span>

              <span className={
                'payment-status ' +
                (statusPagamento(o) === 'Pago'
                  ? 'payment-paid'
                  : 'payment-pending')
              }>
                {statusPagamento(o)}
              </span>
            </div>
          </div>

              <div className="order-customer">
                {o.nome_cliente && (
                  <span>
                    <b>Cliente:</b> {o.nome_cliente}
                  </span>
                )}

                {o.numero_mesa && (
                  <span>
                    <b>Mesa:</b> {o.numero_mesa}
                  </span>
                )}

                {!o.nome_cliente && !o.numero_mesa && (
                  <span>Cliente não identificado</span>
                )}
              </div>

              <small>{date(o.criado_em)}</small>

              <div className="row">
                <b>{brl(o.total)}</b>

                <div className="actions">
                  {o.status !== 'entregue' &&
                    o.status !== 'cancelado' && (
                      <>
                        <button
                          className="secondary"
                          onClick={() => advance(o)}
                        >
                          {o.status === 'recebido'
                            ? 'Iniciar preparo'
                            : o.status === 'em_preparo'
                            ? 'Marcar pronto'
                            : 'Entregar'}
                        </button>

                        <button
                          className="danger"
                          onClick={() => cancel(o)}
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                </div>
              </div>

              <Link to={'/pedido/' + o.id}>
                Detalhes e pagamento →
              </Link>
            </div>
          ))
        ) : (
          <p className="empty">
            Nenhum pedido neste filtro.
          </p>
        )}
      </section>
    </div>
  );
}

function Products(){const [items,S]=useState<Product[]>([]),[cats,C]=useState<Category[]>([]),[name,N]=useState(''),[price,P]=useState(''),[cat,Cat]=useState(''),[edit,Edit]=useState<string|null>(null),[available,A]=useState(true);async function load(){const [{data:p},{data:c}]=await Promise.all([supabase.from('produtos').select('*').order('nome'),supabase.from('categorias').select('*').eq('ativo',true)]);S((p||[]) as Product[]);C((c||[]) as Category[])}useEffect(()=>{load()},[]);async function save(e:React.FormEvent){e.preventDefault();const payload={nome:name,preco:Number(price),categoria_id:cat||null,disponivel:available,ativo:true};const r=edit?await supabase.from('produtos').update(payload).eq('id',edit):await supabase.from('produtos').insert(payload);if(r.error){alert(r.error.message);return}N('');P('');Cat('');Edit(null);load()}function start(p?:Product){Edit(p?.id||null);N(p?.nome||'');P(p?String(p.preco):'');Cat(p?.categoria_id||'');A(p?.disponivel??true)}return <div className="page"><div className="heading"><div><small>CARDÁPIO</small><h1>Produtos</h1></div><button className="primary" onClick={()=>start()}>+ Produto</button></div><section className="panel"><h2>{edit?'Editar produto':'Cadastrar produto'}</h2><form className="formgrid" onSubmit={save}><label>Nome<input value={name} onChange={e=>N(e.target.value)} required/></label><label>Preço<input type="number" min="0" step="0.01" value={price} onChange={e=>P(e.target.value)} required/></label><label>Categoria<select value={cat} onChange={e=>Cat(e.target.value)}><option value="">Sem categoria</option>{cats.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label><label className="check"><input type="checkbox" checked={available} onChange={e=>A(e.target.checked)}/> Disponível</label><button className="primary">Salvar</button>{edit&&<button type="button" className="secondary" onClick={()=>start()}>Cancelar edição</button>}</form></section><section className="panel"><h2>Produtos cadastrados</h2>{items.map(p=><div className="row" key={p.id}><div><b>{p.nome}</b><small>{brl(p.preco)} · {p.disponivel?'Disponível':'Indisponível'}</small></div><div className="actions"><button className="secondary" onClick={()=>start(p)}>Editar</button><button className="secondary" onClick={async()=>{await supabase.from('produtos').update({disponivel:!p.disponivel}).eq('id',p.id);load()}}>{p.disponivel?'Indisponibilizar':'Disponibilizar'}</button></div></div>)}</section><section className="panel"><h2>Categorias</h2><CategoryManager onChange={load}/></section></div>}
function CategoryManager({onChange}:{onChange:()=>void}){const [name,N]=useState('');async function add(e:React.FormEvent){e.preventDefault();const {error}=await supabase.from('categorias').insert({nome:name});if(error)alert(error.message);else{N('');onChange()}}return <form className="inline" onSubmit={add}><input placeholder="Nova categoria" value={name} onChange={e=>N(e.target.value)} required/><button className="primary">Adicionar</button></form>}


function NewOrder() {
  const [products, P] = useState<Product[]>([]);
  const [categories, Cat] = useState<{id: string; nome: string}[]>([]);
  const [cart, C] = useState<Record<string, number>>({});
  const [note, N] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [busy, B] = useState(false);

  const nav = useNavigate();

  useEffect(() => {
    async function loadData() {
      const { data: productsData, error: productsError } =
        await supabase
          .from('produtos')
          .select('*')
          .eq('ativo', true)
          .eq('disponivel', true)
          .order('nome');

      const { data: categoriesData, error: categoriesError } =
        await supabase
          .from('categorias')
          .select('id, nome')
          .order('nome');

      if (productsError) {
        alert(productsError.message);
        return;
      }

      if (categoriesError) {
        alert(categoriesError.message);
        return;
      }

      P((productsData || []) as Product[]);
      Cat(categoriesData || []);
    }

    loadData();
  }, []);

  const total = products.reduce(
    (s, p) => s + (cart[p.id] || 0) * Number(p.preco),
    0
  );

  // Agrupar produtos por categoria
  const groupedProducts = categories
    .map(category => ({
      ...category,
      products: products.filter(
        p => p.categoria_id === category.id
      )
    }))
    .filter(category => category.products.length > 0);

  // Produtos sem categoria
  const uncategorized = products.filter(
    p => !p.categoria_id ||
    !categories.some(c => c.id === p.categoria_id)
  );

  async function submit() {
    const itens = products
      .filter(p => cart[p.id] > 0)
      .map(p => ({
        produto_id: p.id,
        quantidade: cart[p.id]
      }));

    if (!itens.length) return;

    B(true);

    const { data, error } = await supabase.rpc(
      'criar_pedido',
      {
        p_nome_cliente: customerName || null,
        p_numero_mesa: tableNumber || null,
        p_observacao: note || null,
        p_itens: itens
      }
    );

    B(false);

    if (error) {
      alert(error.message);
    } else {
      nav('/pedido/' + data);
    }
  }

  // Componente visual de cada produto
  function ProductItem({ p }: { p: Product }) {
    return (
      <div className="menuitem" key={p.id}>
        <div>
          <b>{p.nome}</b>
          <small>{brl(p.preco)}</small>
        </div>

        <div className="qty">
          <button
            onClick={() =>
              C({
                ...cart,
                [p.id]: Math.max(0, (cart[p.id] || 0) - 1)
              })
            }
          >
            <Minus size={15} />
          </button>

          <b>{cart[p.id] || 0}</b>

          <button
            onClick={() =>
              C({
                ...cart,
                [p.id]: (cart[p.id] || 0) + 1
              })
            }
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="heading">
        <div>
          <small>ATENDIMENTO</small>
          <h1>Novo pedido</h1>
        </div>
      </div>

      <section className="panel">
        <h2>Produtos disponíveis</h2>

        <div className="categories-menu">

          {groupedProducts.map(category => (
            <div className="category-section" key={category.id}>
              <h3>{category.nome}</h3>

              <div className="menu">
                {category.products.map(p => (
                  <ProductItem key={p.id} p={p} />
                ))}
              </div>
            </div>
          ))}

          {uncategorized.length > 0 && (
            <div className="category-section">
              <h3>Sem categoria</h3>

              <div className="menu">
                {uncategorized.map(p => (
                  <ProductItem key={p.id} p={p} />
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="formgrid">
          <label>
            Nome do cliente
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Ex.: João da Silva"
            />
          </label>

          <label>
            Número da mesa
            <input
              type="text"
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              placeholder="Ex.: 02"
            />
          </label>
        </div>

        <label>
          Observação
          <textarea
            value={note}
            onChange={e => N(e.target.value)}
            placeholder="Ex.: Pouco milho, sem cebola..."
          />
        </label>

        <div className="total">
          <span>Total</span>
          <b>{brl(total)}</b>
        </div>

        <button
          className="primary wide"
          disabled={busy || total <= 0}
          onClick={submit}
        >
          {busy ? 'Salvando...' : 'Confirmar pedido'}
        </button>
      </section>
    </div>
  );
}

function OrderDetail() {
  const id = location.pathname.split('/').pop()!;

  const [order, O] = useState<any>(null);
  const [methods, M] = useState<any[]>([]);
  const [method, Me] = useState('');
  const [amount, A] = useState('');

  async function load() {
    const [{ data: o }, { data: m }] = await Promise.all([
      supabase
        .from('pedidos')
        .select('*,itens_pedido(*),pagamentos(*,formas_pagamento(nome))')
        .eq('id', id)
        .single(),

      supabase
        .from('formas_pagamento')
        .select('*')
        .eq('ativo', true)
    ]);

    O(o);
    M(m || []);

    if (m?.length && !method) Me(m[0].id);
  }

  useEffect(() => {
    load();
  }, [id]);

  const paid =
    order?.pagamentos
      ?.filter((p: any) => p.status === 'confirmado')
      .reduce((s: number, p: any) => s + Number(p.valor), 0) || 0;

  async function pay(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.rpc('registrar_pagamento', {
      p_pedido_id: id,
      p_forma_pagamento_id: method,
      p_valor: Number(amount)
    });

    if (error) {
      alert(error.message);
    } else {
      A('');
      load();
    }
  }

  if (!order) return <p>Carregando pedido...</p>;

  return (
    <div className="page">
      <div className="heading">
        <div>
          <small>DETALHES</small>
          <h1>Pedido #{order.numero}</h1>
          <p>{date(order.criado_em)}</p>
        </div>

        <div className="order-detail-actions">
          <span className={'pill ' + order.status}>
            {labelStatus(order.status)}
          </span>

          <Link to="/pedidos" className="secondary">
            ← Voltar aos pedidos
          </Link>
        </div>
      </div>

      <section className="panel">
        <h2>Identificação do cliente</h2>

        <div className="order-customer">
          <span>
            <b>Cliente:</b>{' '}
            {order.nome_cliente || 'Não informado'}
          </span>

          <span>
            <b>Mesa:</b>{' '}
            {order.numero_mesa || 'Não informada'}
          </span>
        </div>
      </section>

      <section className="panel">
        <h2>Itens</h2>

        {order.itens_pedido.map((i: any) => (
          <div className="row" key={i.id}>
            <span>{i.quantidade}× {i.nome_produto}</span>
            <b>{brl(i.subtotal)}</b>
          </div>
        ))}

        <div className="total">
          <span>Total</span>
          <b>{brl(order.total)}</b>
        </div>
      </section>

      <section className="panel">
        <h2>Pagamentos</h2>

        <div className="row">
          <span>Recebido</span>
          <b>{brl(paid)}</b>
        </div>

        <div className="row">
          <span>Saldo</span>
          <b>{brl(Number(order.total) - paid)}</b>
        </div>

        {order.pagamentos.map((p: any) => (
          <div className="row" key={p.id}>
            <span>{p.formas_pagamento?.nome}</span>
            <b>{brl(p.valor)}</b>
          </div>
        ))}

        {Number(order.total) > paid && order.status !== 'cancelado' && (
          <form onSubmit={pay}>
            <label>
              Forma
              <select
                value={method}
                onChange={e => Me(e.target.value)}
              >
                {methods.map(m => (
                  <option value={m.id} key={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Valor
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={Number(order.total) - paid}
                value={amount}
                onChange={e => A(e.target.value)}
                required
              />
            </label>

            <button className="primary wide">
              Registrar pagamento
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
function Reports(){const [start,S]=useState(new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10)),[end,E]=useState(new Date().toISOString().slice(0,10)),[sum,Su]=useState(0),[count,C]=useState(0);async function load(){const from=new Date(start+'T00:00:00-03:00').toISOString(),to=new Date(end+'T23:59:59-03:00').toISOString();const [{data:p},{count:n}]=await Promise.all([supabase.from('pagamentos').select('valor').eq('status','confirmado').gte('criado_em',from).lte('criado_em',to),supabase.from('pedidos').select('*',{count:'exact',head:true}).gte('criado_em',from).lte('criado_em',to).neq('status','cancelado')]);Su((p||[]).reduce((s,x)=>s+Number(x.valor),0));C(n||0)}useEffect(()=>{load()},[]);return <div className="page"><div className="heading"><div><small>ADMINISTRAÇÃO</small><h1>Relatórios</h1></div></div><section className="panel"><div className="formgrid"><label>De<input type="date" value={start} onChange={e=>S(e.target.value)}/></label><label>Até<input type="date" value={end} onChange={e=>E(e.target.value)}/></label><button className="primary" onClick={load}>Filtrar</button></div></section><div className="stats"><Stat label="Total recebido" value={brl(sum)}/><Stat label="Pedidos não cancelados" value={String(count)}/></div></div>}

function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'administrador' | 'funcionario'>('funcionario');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Estados para alteração de senha
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  async function loadUsers() {
    setLoadingUsers(true);

    const { data, error } = await supabase.functions.invoke(
      'gerenciar-usuarios',
      { body: { acao: 'listar' } }
    );

    setLoadingUsers(false);

    if (error) {
      alert('Erro ao carregar usuários: ' + error.message);
      return;
    }

    if (data?.error) {
      alert(data.error);
      return;
    }

    setUsers(data?.usuarios || []);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const { data, error } = await supabase.functions.invoke(
      'gerenciar-usuarios',
      {
        body: {
          acao: 'criar',
          nome: name,
          email,
          senha: password,
          papel: role
        }
      }
    );

    if (error) {
      setBusy(false);
      console.log('ERRO:', error);

      const response = error.context;

      if (response instanceof Response) {
        const texto = await response.clone().text();
        console.log('RESPOSTA ORIGINAL DO SERVIDOR:', texto);
        alert(texto);
      } else {
        alert(error.message);
      }

      return;
    }

    setBusy(false);

    if (data?.error) {
      alert(data.error);
      return;
    }

    alert(data?.mensagem || 'Usuário criado com sucesso!');

    setName('');
    setEmail('');
    setPassword('');
    setRole('funcionario');

    loadUsers();
  }

  async function changeStatus(user: any) {
    const newStatus = !user.ativo;

    const confirmed = window.confirm(
      `Deseja ${newStatus ? 'ativar' : 'desativar'} o usuário ${user.nome}?`
    );

    if (!confirmed) return;

    const { data, error } = await supabase.functions.invoke(
      'gerenciar-usuarios',
      {
        body: {
          acao: 'alterar_status',
          id: user.id,
          ativo: newStatus
        }
      }
    );

    if (error) {
      alert('Erro ao alterar usuário: ' + error.message);
      return;
    }

    if (data?.error) {
      alert(data.error);
      return;
    }

    alert(data?.mensagem || 'Status atualizado!');
    loadUsers();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedUser) return;

    if (newPassword.length < 8) {
      alert('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    const confirmed = window.confirm(
      `Deseja realmente alterar a senha de ${selectedUser.nome}?`
    );

    if (!confirmed) return;

    setChangingPassword(true);

    const { data, error } = await supabase.functions.invoke(
      'gerenciar-usuarios',
      {
        body: {
          acao: 'alterar_senha',
          id: selectedUser.id,
          senha: newPassword
        }
      }
    );

    setChangingPassword(false);

    if (error) {
      alert('Erro ao alterar senha: ' + error.message);
      return;
    }

    if (data?.error) {
      alert(data.error);
      return;
    }

    alert(data?.mensagem || 'Senha alterada com sucesso!');

    setSelectedUser(null);
    setNewPassword('');
  }

  return (
    <div className="page">
      <div className="heading">
        <div>
          <small>ADMINISTRAÇÃO</small>
          <h1>Usuários</h1>
          <p>Gerencie os acessos ao sistema.</p>
        </div>

        <button className="secondary" onClick={loadUsers}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      <section className="panel">
        <h2>Cadastrar usuário</h2>

        <form className="formgrid" onSubmit={createUser}>
          <label>
            Nome completo
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome do funcionário"
              required
            />
          </label>

          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@email.com"
              required
            />
          </label>

          <label>
            Senha inicial
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Digite a senha inicial"
              minLength={8}
              required
            />
          </label>

          <label>
            Tipo de usuário
            <select
              value={role}
              onChange={e =>
                setRole(e.target.value as 'administrador' | 'funcionario')
              }
            >
              <option value="funcionario">Funcionário</option>
              <option value="administrador">Administrador</option>
            </select>
          </label>

          <button className="primary" disabled={busy}>
            {busy ? 'Criando usuário...' : 'Criar usuário'}
          </button>
        </form>

        <p className="empty">
          O usuário será criado imediatamente e poderá acessar o sistema usando o e-mail e a senha inicial definidos acima.
        </p>
      </section>

      <section className="panel">
        <h2>Usuários cadastrados</h2>

        {loadingUsers ? (
          <p className="empty">Carregando usuários...</p>
        ) : users.length === 0 ? (
          <p className="empty">Nenhum usuário encontrado.</p>
        ) : (
          users.map(user => (
            <div className="row" key={user.id}>
              <div>
                <b>{user.nome}</b>
                <small>{user.email}</small>
                <small>
                  {user.papel === 'administrador'
                    ? 'Administrador'
                    : 'Funcionário'}
                  {' · '}
                  {user.ativo ? 'Ativo' : 'Inativo'}
                </small>
              </div>

              <div className="actions">
                <button
                  className="secondary"
                  onClick={() => {
                    setSelectedUser(user);
                    setNewPassword('');
                  }}
                >
                  Alterar senha
                </button>

                <button
                  className={user.ativo ? 'danger' : 'secondary'}
                  onClick={() => changeStatus(user)}
                >
                  {user.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Formulário aparece apenas uma vez, fora do users.map() */}
      {selectedUser && (
        <section className="panel">
          <h2>Alterar senha</h2>

          <p>
            Definir nova senha para <b>{selectedUser.nome}</b>.
          </p>

          <form onSubmit={changePassword}>
            <label>
              Nova senha
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
                minLength={8}
                required
              />
            </label>

            <div className="actions">
              <button
                type="submit"
                className="primary"
                disabled={changingPassword}
              >
                {changingPassword ? 'Alterando...' : 'Salvar nova senha'}
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setSelectedUser(null);
                  setNewPassword('');
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function PrimeiroAcesso() {
  const nav = useNavigate();

  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function salvarSenha(e: React.FormEvent) {
    e.preventDefault();

    if (senha.length < 6) {
      alert('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      alert('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: senha
    });

    setLoading(false);

    if (error) {
      alert('Erro ao definir senha: ' + error.message);
      return;
    }

    await supabase.auth.signOut();

    alert('Senha criada com sucesso! Faça seu login.');
    nav('/login');
  }

  return (
    <div className="login">
      <h2>Primeiro acesso</h2>
      <p>Defina sua senha para acessar o Espetinho Manager.</p>

      <form onSubmit={salvarSenha}>
        <input
          type="password"
          placeholder="Nova senha"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Confirme sua senha"
          value={confirmarSenha}
          onChange={e => setConfirmarSenha(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Criar senha'}
        </button>
      </form>
    </div>
  );
}

function Guard({profile,children,admin=false}:{profile:Profile;children:React.ReactNode;admin?:boolean}){if(admin&&profile.papel!=='administrador')return <Navigate to="/"/>;return <>{children}</>}
export default function App(){const [session,S]=useState<any>(null),[profile,P]=useState<Profile|null>(null),[loading,L]=useState(true);useEffect(()=>{supabase.auth.getSession().then(async({data})=>{S(data.session);if(data.session){const {data:p}=await supabase.from('perfis').select('*').eq('id',data.session.user.id).single();P(p)}L(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{S(s);if(!s){P(null);L(false)}else setTimeout(()=>supabase.from('perfis').select('*').eq('id',s.user.id).single().then(({data})=>{P(data);L(false)}),0)});return()=>subscription.unsubscribe()},[]);if(!configured)return <div className="login"><div className="loginbox"><h1>Configure o Supabase</h1><p>Crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Consulte o README.</p></div></div>;if(loading)return <div className="login">Carregando...</div>;return <Routes>
  <Route path="/primeiro-acesso" element={<PrimeiroAcesso/>}/>
  <Route path="/login" element={session?<Navigate to="/"/>:<Login/>}/><Route path="*" element={!session?<Navigate to="/login"/>:!profile||!profile.ativo?<div className="login">Perfil não ativo. Procure o administrador.</div>:<AppShell profile={profile}><Routes><Route path="/" element={<Dashboard/>}/><Route path="/pedidos" element={<Orders/>}/><Route path="/novo" element={<NewOrder/>}/><Route path="/pedido/:id" element={<OrderDetail/>}/><Route path="/produtos" element={<Guard profile={profile} admin><Products/></Guard>}/><Route path="/relatorios" element={<Guard profile={profile} admin><Reports/></Guard>}/>
<Route path="/usuarios" element={<Guard profile={profile} admin><UsersPage/></Guard>}/>
<Route path="*" element={<Navigate to="/"/>}/></Routes></AppShell>}/></Routes>}
