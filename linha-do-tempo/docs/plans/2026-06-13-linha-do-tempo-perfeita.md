# Linha do Tempo Perfeita — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `skills:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma SPA React com Supabase para gestão de linhas do tempo previdenciárias rurais, hospedada no GitHub Pages, pronta para virar SaaS na Fase 3.

**Architecture:** SPA React + Vite dentro de `linha-do-tempo/app/`, deploy via GitHub Actions para GitHub Pages. Supabase gerencia auth (email+senha) e banco PostgreSQL. Motor de cálculo é puro JS client-side. Autosave via debounce nas mutations do Supabase.

**Tech Stack:** React 18, Vite, Supabase JS v2, React Router v6 (HashRouter), Tailwind CSS, Vitest, Testing Library, html2canvas, PDF.js

---

## Cores do Brand (usar em todo CSS)

```css
--navy: #0B1F3A;
--gold: #C9A84C;
--charcoal: #2C2C2C;
--gray-light: #F5F5F5;
--navy-tint: #D0D8E0;
```

---

## File Structure

```
linha-do-tempo/app/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── package.json
├── .env.example
├── public/
│   └── 404.html               # GitHub Pages SPA fallback
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── lib/
│   │   ├── supabase.js        # cliente Supabase (singleton)
│   │   └── calculo.js         # motor de carência (puro JS, testável)
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useTimeline.js     # CRUD + autosave
│   │   └── useAutosave.js     # debounce 800ms
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── ListagemPage.jsx
│   │   └── EditorPage.jsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.jsx
│   │   │   ├── MonthYearPicker.jsx
│   │   │   ├── Accordion.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── Tooltip.jsx
│   │   ├── editor/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── EditorToolbar.jsx
│   │   │   ├── secoes/
│   │   │   │   ├── SecaoAtividadeRural.jsx
│   │   │   │   ├── SecaoVinculosUrbanos.jsx
│   │   │   │   ├── SecaoProvasRetorno.jsx
│   │   │   │   ├── SecaoIRs.jsx
│   │   │   │   └── SecaoIncapacidade.jsx
│   │   │   ├── visualizacao/
│   │   │   │   ├── ModeloHorizontal.jsx   # Canvas/SVG régua de anos
│   │   │   │   ├── ModeloCurvas.jsx       # SVG serpentina 90 meses
│   │   │   │   └── Legenda.jsx
│   │   │   └── views/
│   │   │       ├── ViewLinhaDoTempo.jsx
│   │   │       ├── ViewDescreverIRs.jsx
│   │   │       ├── ViewDescreverVinculos.jsx
│   │   │       └── ViewRelatorio.jsx
│   └── styles/
│       └── globals.css
└── tests/
    ├── calculo.test.js        # TDD rigoroso aqui — lógica pura
    └── components/
        └── MonthYearPicker.test.jsx
```

---

## Database Schema (Supabase)

```sql
-- Rodar via Supabase MCP: apply_migration

CREATE TABLE timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_cliente TEXT NOT NULL,
  tipo_beneficio TEXT NOT NULL CHECK (tipo_beneficio IN (
    'aposentadoria_rural', 'hibrida', 'demais_rurais'
  )),
  inicio_mes INT NOT NULL CHECK (inicio_mes BETWEEN 1 AND 12),
  inicio_ano INT NOT NULL,
  der_mes INT NOT NULL CHECK (der_mes BETWEEN 1 AND 12),
  der_ano INT NOT NULL,
  modelo_visual TEXT DEFAULT 'horizontal' CHECK (modelo_visual IN ('horizontal','curvas')),
  descricao_irs_prs TEXT DEFAULT '',
  descricao_vinculos TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vinculos_urbanos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE NOT NULL,
  origem TEXT NOT NULL,
  inicio_mes INT NOT NULL, inicio_ano INT NOT NULL,
  fim_mes INT NOT NULL, fim_ano INT NOT NULL
);

CREATE TABLE provas_retorno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE NOT NULL,
  data_mes INT NOT NULL, data_ano INT NOT NULL
);

CREATE TABLE instrumentos_ratificadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE NOT NULL,
  data_mes INT NOT NULL, data_ano INT NOT NULL
);

CREATE TABLE beneficios_incapacidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID REFERENCES timelines(id) ON DELETE CASCADE NOT NULL,
  inicio_mes INT NOT NULL, inicio_ano INT NOT NULL,
  fim_mes INT NOT NULL, fim_ano INT NOT NULL
);

-- RLS
ALTER TABLE timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE vinculos_urbanos ENABLE ROW LEVEL SECURITY;
ALTER TABLE provas_retorno ENABLE ROW LEVEL SECURITY;
ALTER TABLE instrumentos_ratificadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficios_incapacidade ENABLE ROW LEVEL SECURITY;

-- Policy: usuário vê apenas seus dados
CREATE POLICY "own timelines" ON timelines
  FOR ALL USING (auth.uid() = user_id);

-- Policy para tabelas filhas: acesso via timeline do usuário
CREATE POLICY "own vinculos" ON vinculos_urbanos
  FOR ALL USING (timeline_id IN (SELECT id FROM timelines WHERE user_id = auth.uid()));

CREATE POLICY "own provas" ON provas_retorno
  FOR ALL USING (timeline_id IN (SELECT id FROM timelines WHERE user_id = auth.uid()));

CREATE POLICY "own irs" ON instrumentos_ratificadores
  FOR ALL USING (timeline_id IN (SELECT id FROM timelines WHERE user_id = auth.uid()));

CREATE POLICY "own incapacidades" ON beneficios_incapacidade
  FOR ALL USING (timeline_id IN (SELECT id FROM timelines WHERE user_id = auth.uid()));
```

---

## Lógica de Cálculo (confirmada vs. estimada)

### Confirmado (implementar):
1. Vínculo Urbano **interrompe** carência rural
2. Prova de Retorno **não retroage** — tempo rural válido só a partir da PR
3. IR deve estar dentro do intervalo da Atividade Rural
4. Aposentadoria Rural / Demais: `Total = tempo_rural_reconhecido`
5. Híbrida: `Total = rural + urbano` (converge para 90 meses quando suficiente)
6. Benefício por Incapacidade rural = marcador visual + conta como carência (não altera cálculo base confirmado)

### Estimado / Pendente (marcar com `⚠️ ESTIMADO`):
- Fórmula exata de como IR expande "Tempo Rural Efetivamente Reconhecido"
- Relação IR com janelas de 90 meses do ofício-circular 46/2019

---

## FASE 1 — Setup do Projeto

### Task 1: Inicializar app Vite + React

**Files:**
- Create: `linha-do-tempo/app/package.json`
- Create: `linha-do-tempo/app/vite.config.js`
- Create: `linha-do-tempo/app/index.html`
- Create: `linha-do-tempo/app/src/main.jsx`
- Create: `linha-do-tempo/app/src/App.jsx`

- [ ] Criar pasta e inicializar:
```bash
cd "linha-do-tempo"
mkdir app && cd app
npm create vite@latest . -- --template react
npm install
npm install @supabase/supabase-js react-router-dom html2canvas
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/ui jsdom
```

- [ ] Configurar `vite.config.js` para GitHub Pages:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/linha-do-tempo-perfeita/', // nome do repo GitHub
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
  },
})
```

- [ ] Criar `tests/setup.js`:
```js
import '@testing-library/jest-dom'
```

- [ ] Criar `.env.example`:
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

- [ ] Testar que o dev server sobe:
```bash
npm run dev
```
Esperado: `localhost:5173` abre sem erros.

- [ ] Commit:
```bash
git add linha-do-tempo/app/
git commit -m "feat: inicializa app React+Vite para Linha do Tempo Perfeita"
```

---

### Task 2: Design System (CSS variables + componentes base)

**Files:**
- Create: `src/styles/globals.css`
- Create: `src/components/ui/Button.jsx`
- Create: `src/components/ui/Accordion.jsx`
- Create: `src/components/ui/MonthYearPicker.jsx`
- Create: `src/components/ui/Tooltip.jsx`
- Create: `src/components/ui/Modal.jsx`

- [ ] Criar `src/styles/globals.css`:
```css
:root {
  --navy: #0B1F3A;
  --gold: #C9A84C;
  --charcoal: #2C2C2C;
  --gray-light: #F5F5F5;
  --navy-tint: #D0D8E0;
  --white: #FFFFFF;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Georgia, serif; background: var(--gray-light); color: var(--charcoal); }

.btn-primary {
  background: var(--gold); color: var(--navy);
  border: none; padding: 8px 16px; font-weight: bold;
  cursor: pointer; border-radius: 4px;
}
.btn-primary:hover { opacity: 0.9; }
.btn-secondary {
  background: transparent; color: var(--gold);
  border: 2px solid var(--gold); padding: 8px 16px;
  cursor: pointer; border-radius: 4px;
}
```

- [ ] Criar `src/components/ui/MonthYearPicker.jsx`:
```jsx
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export function MonthYearPicker({ label, mes, ano, onChange }) {
  const anoAtual = new Date().getFullYear()
  const anos = Array.from({ length: 50 }, (_, i) => anoAtual - i)

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {label && <label>{label}</label>}
      <select value={mes} onChange={e => onChange(Number(e.target.value), ano)}>
        {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
      </select>
      <select value={ano} onChange={e => onChange(mes, Number(e.target.value))}>
        {anos.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  )
}
```

- [ ] Escrever teste para MonthYearPicker:
```js
// tests/components/MonthYearPicker.test.jsx
import { render, screen } from '@testing-library/react'
import { MonthYearPicker } from '../../src/components/ui/MonthYearPicker'

test('renderiza label e selects de mês e ano', () => {
  render(<MonthYearPicker label="Data" mes={1} ano={2020} onChange={() => {}} />)
  expect(screen.getByText('Data')).toBeInTheDocument()
  expect(screen.getAllByRole('combobox')).toHaveLength(2)
})
```

- [ ] Rodar teste:
```bash
npm run test
```
Esperado: PASS

- [ ] Commit:
```bash
git commit -m "feat: design system base — CSS vars brand + componentes UI"
```

---

## FASE 2 — Banco de Dados + Auth

### Task 3: Criar schema no Supabase

**Files:** (via Supabase MCP, sem arquivos locais além da migration)
- Create: `linha-do-tempo/app/supabase/migrations/001_schema.sql`

- [ ] Criar arquivo de migration local (copiar SQL do schema acima)

- [ ] Aplicar via Supabase MCP (`apply_migration`) com o SQL completo do schema

- [ ] Verificar via `list_tables` que as 5 tabelas existem

- [ ] Verificar via `execute_sql` que RLS está ativo:
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public';
```
Esperado: todas as tabelas com `rowsecurity = true`

- [ ] Commit:
```bash
git commit -m "feat: schema Supabase — timelines + tabelas filhas + RLS"
```

---

### Task 4: Cliente Supabase + Auth

**Files:**
- Create: `src/lib/supabase.js`
- Create: `src/hooks/useAuth.js`
- Create: `src/pages/LoginPage.jsx`

- [ ] Criar `src/lib/supabase.js`:
```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- [ ] Criar `src/hooks/useAuth.js`:
```js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const login = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const logout = () => supabase.auth.signOut()

  return { user, loading, login, logout }
}
```

- [ ] Criar `src/pages/LoginPage.jsx` com formulário email+senha, cores Navy/Gold

- [ ] Criar `src/App.jsx` com rotas HashRouter:
```jsx
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { ListagemPage } from './pages/ListagemPage'
import { EditorPage } from './pages/EditorPage'

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div>Carregando...</div>
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <ListagemPage /> : <Navigate to="/login" />} />
        <Route path="/editor/:id" element={user ? <EditorPage /> : <Navigate to="/login" />} />
      </Routes>
    </HashRouter>
  )
}
```

- [ ] Testar login manualmente no browser (criar usuário no Supabase Dashboard)

- [ ] Commit:
```bash
git commit -m "feat: auth Supabase — login/logout + rotas protegidas"
```

---

## FASE 3 — Motor de Cálculo (TDD rigoroso)

### Task 5: Motor de carência (lógica confirmada)

**Files:**
- Create: `src/lib/calculo.js`
- Create: `tests/calculo.test.js`

- [ ] Escrever TODOS os testes primeiro (`tests/calculo.test.js`):

```js
import { calcularCarencia, mesParaAbsoluto } from '../src/lib/calculo'

// Helpers
const MY = (mes, ano) => ({ mes, ano })

describe('mesParaAbsoluto', () => {
  test('Jan/2011 = 0 relativo a Jan/2011', () => {
    expect(mesParaAbsoluto(MY(1, 2011), MY(1, 2011))).toBe(0)
  })
  test('Dez/2011 = 11 relativo a Jan/2011', () => {
    expect(mesParaAbsoluto(MY(12, 2011), MY(1, 2011))).toBe(11)
  })
})

describe('Aposentadoria Rural — sem vínculos urbanos', () => {
  test('sem IRs: total = 0', () => {
    const result = calcularCarencia({
      tipoBeneficio: 'aposentadoria_rural',
      inicioAtividade: MY(1, 2011),
      der: MY(6, 2026),
      vinculosUrbanos: [],
      provasRetorno: [],
      instrumentosRatificadores: [],
      beneficiosIncapacidade: [],
    })
    expect(result.total).toBe(0)
  })

  test('com 1 IR: reconhece período rural', () => {
    const result = calcularCarencia({
      tipoBeneficio: 'aposentadoria_rural',
      inicioAtividade: MY(1, 2011),
      der: MY(6, 2026),
      vinculosUrbanos: [],
      provasRetorno: [],
      instrumentosRatificadores: [MY(1, 2013)],
      beneficiosIncapacidade: [],
    })
    expect(result.total).toBeGreaterThan(0)
    // ⚠️ ESTIMADO: valor exato não derivado — só verifica que é positivo
  })
})

describe('Híbrida — vínculo urbano conta no total', () => {
  test('24 meses urbano, sem PR: rural=0, urbano=24, total=24', () => {
    const result = calcularCarencia({
      tipoBeneficio: 'hibrida',
      inicioAtividade: MY(1, 2011),
      der: MY(6, 2026),
      vinculosUrbanos: [{ origem: 'Empresa Teste', inicio: MY(1, 2015), fim: MY(12, 2016) }],
      provasRetorno: [],
      instrumentosRatificadores: [],
      beneficiosIncapacidade: [],
    })
    expect(result.urbano).toBe(24)
    expect(result.rural).toBe(0)
    expect(result.total).toBe(24)
  })

  test('com PR após vínculo: rural > 0', () => {
    const result = calcularCarencia({
      tipoBeneficio: 'hibrida',
      inicioAtividade: MY(1, 2011),
      der: MY(6, 2026),
      vinculosUrbanos: [{ origem: 'Empresa', inicio: MY(1, 2015), fim: MY(12, 2016) }],
      provasRetorno: [MY(1, 2017)],
      instrumentosRatificadores: [],
      beneficiosIncapacidade: [],
    })
    expect(result.rural).toBeGreaterThan(0)
    expect(result.urbano).toBe(24)
  })
})

describe('Demais Benefícios Rurais — vínculo urbano não conta no total', () => {
  test('com vínculo urbano: total = apenas rural', () => {
    const result = calcularCarencia({
      tipoBeneficio: 'demais_rurais',
      inicioAtividade: MY(1, 2011),
      der: MY(6, 2026),
      vinculosUrbanos: [{ origem: 'Empresa', inicio: MY(1, 2015), fim: MY(12, 2016) }],
      provasRetorno: [MY(1, 2017)],
      instrumentosRatificadores: [MY(1, 2013)],
      beneficiosIncapacidade: [],
    })
    expect(result).not.toHaveProperty('urbano')
    expect(result.total).toBe(result.rural)
  })
})
```

- [ ] Rodar testes — todos devem FALHAR (função não existe):
```bash
npm run test tests/calculo.test.js
```

- [ ] Implementar `src/lib/calculo.js`:

```js
// Converte {mes, ano} para número absoluto de meses desde ano 0
export function mesParaAbsoluto(my, base) {
  if (base) return (my.ano - base.ano) * 12 + (my.mes - base.mes)
  return my.ano * 12 + my.mes
}

export function duracaoMeses(inicio, fim) {
  return (fim.ano - inicio.ano) * 12 + (fim.mes - inicio.mes)
}

/**
 * Calcula carência com base nas regras confirmadas.
 * ⚠️ ESTIMADO: a fórmula exata do IR expandindo o Tempo Rural
 * não foi derivada. Implementação atual: IR "valida" o bloco de
 * tempo rural anterior ao próximo vínculo urbano (ou até a DER).
 */
export function calcularCarencia({
  tipoBeneficio,
  inicioAtividade,
  der,
  vinculosUrbanos,
  provasRetorno,
  instrumentosRatificadores,
  beneficiosIncapacidade,
}) {
  // Ordenar por data
  const vinculos = [...vinculosUrbanos].sort(
    (a, b) => mesParaAbsoluto(a.inicio) - mesParaAbsoluto(b.inicio)
  )
  const provas = [...provasRetorno].sort(
    (a, b) => mesParaAbsoluto(a) - mesParaAbsoluto(b)
  )
  const irs = [...instrumentosRatificadores].sort(
    (a, b) => mesParaAbsoluto(a) - mesParaAbsoluto(b)
  )

  // Calcular meses totais de vínculos urbanos
  const mesesUrbanos = vinculos.reduce(
    (acc, v) => acc + duracaoMeses(v.inicio, v.fim), 0
  )

  // ⚠️ ESTIMADO: cálculo rural simplificado
  // Regra confirmada: PR não retroage — rural válido só a partir da PR
  // Regra confirmada: sem IR, rural = 0
  let mesesRural = 0

  if (irs.length > 0) {
    if (vinculos.length === 0) {
      // Sem vínculos: todo período de inicioAtividade até DER é rural (se há IR)
      mesesRural = duracaoMeses(inicioAtividade, der)
    } else {
      // Com vínculos: rural = períodos entre inicioAtividade e vínculos,
      // mais períodos pós-PR até DER (⚠️ ESTIMADO)
      const primeiroVinculo = vinculos[0]
      mesesRural = duracaoMeses(inicioAtividade, primeiroVinculo.inicio)

      // Pós-PR: período da última PR até DER
      if (provas.length > 0) {
        const ultimaPR = provas[provas.length - 1]
        const ultimoVinculo = vinculos[vinculos.length - 1]
        if (mesParaAbsoluto(ultimaPR) > mesParaAbsoluto(ultimoVinculo.fim)) {
          mesesRural += duracaoMeses(ultimaPR, der)
        }
      }
    }
  }

  if (tipoBeneficio === 'aposentadoria_rural' || tipoBeneficio === 'demais_rurais') {
    return { rural: mesesRural, total: mesesRural }
  }

  // Híbrida
  const total = mesesRural + mesesUrbanos
  return { rural: mesesRural, urbano: mesesUrbanos, total }
}
```

- [ ] Rodar testes — devem PASSAR:
```bash
npm run test tests/calculo.test.js
```

- [ ] Commit:
```bash
git commit -m "feat: motor de carência — lógica confirmada + testes (⚠️ IR estimado marcado)"
```

---

## FASE 4 — CRUD de Timelines

### Task 6: Listagem + Nova Timeline

**Files:**
- Create: `src/hooks/useTimeline.js`
- Create: `src/pages/ListagemPage.jsx`

- [ ] Implementar `src/hooks/useTimeline.js` com `listar()`, `criar()`, `excluir()`, `carregar(id)`, `atualizar()`

- [ ] Implementar `ListagemPage.jsx`:
  - Saudação "Olá, {email}!"
  - Form "Nova Linha do Tempo" com campos do schema
  - Lista de timelines com "Editar" e "Excluir"
  - Excluir: `window.confirm()` nativo → DELETE Supabase → re-render sem reload

- [ ] Testar manualmente: criar, listar, excluir timeline

- [ ] Commit:
```bash
git commit -m "feat: listagem de timelines — CRUD + form nova timeline"
```

---

## FASE 5 — Editor

### Task 7: Estrutura do Editor (Sidebar + Toolbar)

**Files:**
- Create: `src/pages/EditorPage.jsx`
- Create: `src/components/editor/Sidebar.jsx`
- Create: `src/components/editor/EditorToolbar.jsx`
- Create: `src/hooks/useAutosave.js`

- [ ] `EditorPage.jsx`: layout 2 colunas (sidebar 320px + área principal flex-1)

- [ ] `Sidebar.jsx`: 5 seções em acordeão, numeradas, fundo Navy, texto white quando ativo

- [ ] `EditorToolbar.jsx`: título "Linha do Tempo {nome}", botão Salvar, dropdown Modelos, botão Exportar (verde/gold)

- [ ] `useAutosave.js`:
```js
import { useEffect, useRef } from 'react'

export function useAutosave(data, saveFn, delay = 800) {
  const timer = useRef(null)
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => saveFn(data), delay)
    return () => clearTimeout(timer.current)
  }, [data])
}
```

- [ ] Commit:
```bash
git commit -m "feat: estrutura do editor — sidebar acordeão + toolbar + autosave"
```

---

### Task 8: 5 Seções do Accordion

**Files:** `src/components/editor/secoes/*.jsx`

- [ ] `SecaoAtividadeRural.jsx`: tipo benefício (select 3 opções) + DER + Início + botão "Gerar"
- [ ] `SecaoVinculosUrbanos.jsx`: form origem+datas + lista + botão "Carregar CNIS" → Modal
- [ ] `SecaoProvasRetorno.jsx`: MonthYearPicker + lista + tooltip com texto do mapeamento
- [ ] `SecaoIRs.jsx`: MonthYearPicker + lista + tooltip IN 128/2022
- [ ] `SecaoIncapacidade.jsx`: MonthYearPicker inicio+fim + lista + tooltip

- [ ] Commit:
```bash
git commit -m "feat: 5 seções do editor — formulários + listas"
```

---

## FASE 6 — Visualizações

### Task 9: Modelo Horizontal (SVG)

**Files:** `src/components/editor/visualizacao/ModeloHorizontal.jsx`

- [ ] SVG com régua de anos (inicioAtividade → DER + 1)
- [ ] Marcadores coloridos por tipo (usar cores confirmadas do mapeamento):
  - Laranja: carência (blocos)
  - Verde: IR (linha vertical)
  - Azul: Vínculo Urbano (bloco preenchido)
  - Vermelho: Prova de Retorno (linha)
  - Amarelo: Incapacidade (bloco)
- [ ] Marcador "DER" no fim
- [ ] Scroll horizontal quando necessário

- [ ] Commit:
```bash
git commit -m "feat: modelo horizontal — régua de anos SVG com marcadores coloridos"
```

---

### Task 10: Modelo Curvas (Serpentina 90 meses)

**Files:** `src/components/editor/visualizacao/ModeloCurvas.jsx`

- [ ] Layout serpentina: linha 1 decrescente (DER-90m → início) + linha 2 crescente (até DER)
- [ ] Blocos de 90 meses conforme ofício-circular 46/2019
- [ ] Label "Períodos de 90 meses"

- [ ] Commit:
```bash
git commit -m "feat: modelo curvas — serpentina 90 meses"
```

---

### Task 11: Legenda + 4 Views

**Files:** `src/components/editor/visualizacao/Legenda.jsx`, `src/components/editor/views/*.jsx`

- [ ] `Legenda.jsx`: 5 itens com cor + descrição
- [ ] `ViewLinhaDoTempo.jsx`: modelos + legenda + tabela carência (diferente por tipo)
- [ ] `ViewDescreverIRs.jsx`: textarea + botão "Salvar descrição"
- [ ] `ViewDescreverVinculos.jsx`: textarea + botão "Salvar descrição"
- [ ] `ViewRelatorio.jsx`: tabela "Tempo Rural Efetivamente Reconhecido" + tabela vínculos + botão "Exportar relatório"
- [ ] `EditorToolbar.jsx`: dropdown "Opções" com 4 views

- [ ] Commit:
```bash
git commit -m "feat: 4 views do editor — LDT, descrever IRs/vínculos, relatório"
```

---

## FASE 7 — Export + CNIS

### Task 12: Export PNG

**Files:** `src/components/editor/EditorToolbar.jsx` (modificar)

- [ ] Instalar: `npm install html2canvas`
- [ ] Botão "Exportar Linha do Tempo" → `html2canvas(document.querySelector('.area-timeline'))` → abre nova aba com imagem + link download

- [ ] Commit:
```bash
git commit -m "feat: export PNG da linha do tempo via html2canvas"
```

---

### Task 13: Upload CNIS (PDF.js)

**Files:** `src/components/editor/secoes/SecaoVinculosUrbanos.jsx` (modificar), `src/lib/cnis-parser.js`

- [ ] Instalar: `npm install pdfjs-dist`
- [ ] Modal "Adicionando Vínculo Urbano" com input de arquivo
- [ ] `cnis-parser.js`: parse client-side via PDF.js, buscar marcadores de texto do CNIS INSS
- [ ] Se parsing falhar: log de erro, sem alterar timeline
- [ ] Botão "Salvar" no modal: desabilitado até arquivo selecionado

- [ ] Commit:
```bash
git commit -m "feat: upload CNIS — modal + parser PDF.js client-side"
```

---

## FASE 8 — Deploy

### Task 14: GitHub Actions + GitHub Pages

**Files:**
- Create: `.github/workflows/deploy-ldt.yml`
- Create: `linha-do-tempo/app/public/404.html`

- [ ] Criar `404.html` para SPA fallback:
```html
<!DOCTYPE html>
<html><head>
<script>
  sessionStorage.redirect = location.href;
</script>
<meta http-equiv="refresh" content="0;URL='/'">
</head></html>
```

- [ ] Criar workflow:
```yaml
name: Deploy Linha do Tempo Perfeita

on:
  push:
    branches: [main]
    paths: ['linha-do-tempo/app/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd linha-do-tempo/app && npm ci && npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: linha-do-tempo/app/dist
```

- [ ] Adicionar secrets no GitHub: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

- [ ] Push → verificar GitHub Actions → acessar URL do GitHub Pages

- [ ] Commit:
```bash
git commit -m "feat: CI/CD — deploy automático GitHub Pages via Actions"
```

---

## Riscos e Dependências

| Risco | Mitigação |
|---|---|
| Fórmula IR não derivada | Marcada como ⚠️ ESTIMADO; versão futura após bateria de testes no SLT |
| GitHub Pages com HashRouter | Usando `#` nas rotas — sem problema com SPA |
| PDF.js + CNIS real | Parser precisa ser testado com um CNIS real do INSS |
| Supabase free tier (pause após 1 sem. inativo) | Upgrade quando virar SaaS (Fase 3) |

## Preparação Fase 3 (SaaS)

Decisões já tomadas para facilitar a migração:
- RLS habilitado desde o início
- `user_id` em todas as timelines
- HashRouter → fácil migração para domínio próprio
- Supabase Auth → adicionar billing com Stripe depois
