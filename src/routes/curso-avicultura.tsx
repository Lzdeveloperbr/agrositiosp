import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { BookOpen, CheckCircle2, CirclePlay, Clock3, Award, ExternalLink, GraduationCap, ShieldCheck, ChevronDown, ChevronUp, ClipboardList, Download, RotateCcw } from "lucide-react";
import { jsPDF } from "jspdf";
import { AvicultureStudyMaterials } from "@/components/AvicultureStudyMaterials";

export const Route = createFileRoute("/curso-avicultura")({
  head: () => ({ meta: [
    { title: "Academia Avícola — Curso Profissional de Avicultura de Corte | Agro Sítio SP" },
    { name: "description", content: "Trilha de aprendizagem em avicultura de corte com videoaulas selecionadas, atividades, avaliação e certificado de conclusão." },
  ] }),
  component: CursoAviculturaPage,
});

type Lesson = { id: string; title: string; duration: string; summary: string; videoId?: string; search?: string; source?: string; };
type Module = { id: string; title: string; description: string; lessons: Lesson[] };

const MODULES: Module[] = [
  { id: "fundamentos", title: "Fundamentos da avicultura de corte", description: "Cadeia produtiva, sistemas de criação, linhagens e indicadores básicos.", lessons: [
    { id: "f1", title: "Panorama da produção de frangos de corte", duration: "12 min", summary: "Entenda as etapas da cadeia, os agentes envolvidos e os objetivos de produtividade e qualidade.", videoId: "nDeBTHN7NW4", source: "Cursos CPT — Produção de Frangos de Corte" },
    { id: "f2", title: "Linhagens, genética e potencial zootécnico", duration: "15 min", summary: "Conheça o papel da genética, uniformidade, sexo e especificações da linhagem. Consulte sempre o manual oficial da linhagem utilizada.", search: "linhagens frango de corte genética desempenho zootécnico aula" },
  ]},
  { id: "instalacoes", title: "Instalações, equipamentos e preparação do aviário", description: "Estrutura, ambiência, pré-alojamento e preparação para receber os pintinhos.", lessons: [
    { id: "i1", title: "Instalações e equipamentos do aviário", duration: "18 min", summary: "Reconheça os componentes do galpão, comedouros, bebedouros, silos, exaustores e sistemas de resfriamento.", search: "instalações equipamentos aviário frango de corte aula técnica" },
    { id: "i2", title: "Pré-alojamento e preparação do galpão", duration: "16 min", summary: "Organize limpeza, desinfecção, cama, aquecimento, água, ração e checagens antes da chegada das aves.", search: "pré alojamento preparação galpão frango de corte Embrapa Senar" },
  ]},
  { id: "primeira-semana", title: "Manejo inicial e primeira semana", description: "Recepção, comportamento, temperatura, acesso à água e ração e avaliação do lote.", lessons: [
    { id: "p1", title: "Recepção dos pintinhos e manejo inicial", duration: "20 min", summary: "Observe distribuição, atividade, enchimento do papo, acesso aos equipamentos e resposta das aves ao ambiente.", search: "manejo inicial pintinhos frango de corte primeira semana aula" },
    { id: "p2", title: "A importância da primeira semana", duration: "14 min", summary: "Acompanhe os fatores que influenciam arranque, uniformidade, desenvolvimento e desempenho futuro.", search: "a importância da primeira semana em frangos de corte" },
  ]},
  { id: "ambiência", title: "Ambiência, ventilação e conforto térmico", description: "Temperatura, umidade, velocidade do ar, pressão negativa e ventilação.", lessons: [
    { id: "a1", title: "Ambiência na produção de aves", duration: "18 min", summary: "Estude como temperatura, umidade, qualidade do ar e velocidade do ar interagem com a idade e condição das aves.", search: "USP ambiência na produção de aves aula frango de corte" },
    { id: "a2", title: "Ventilação mínima, transição e túnel", duration: "22 min", summary: "Compreenda os objetivos dos estágios de ventilação e a importância de aferir sensores e entradas de ar.", search: "ventilação mínima transição túnel pressão negativa aviário frango de corte aula" },
  ]},
  { id: "agua-racao", title: "Água, nutrição e alimentação", description: "Qualidade da água, linhas de nipple, consumo e programas nutricionais.", lessons: [
    { id: "ar1", title: "Manejo da alimentação de frangos de corte", duration: "20 min", summary: "Conheça conceitos de consumo, formulação, fases de alimentação e nutrientes. A dieta deve seguir orientação técnica e programa nutricional.", search: "USP manejo da alimentação de frango de corte proteína ideal minerais vitaminas" },
    { id: "ar2", title: "Água, vazão e pressão dos nipples", duration: "16 min", summary: "Aprenda por que medir qualidade, disponibilidade, vazão e pressão em pontos representativos, inclusive no final da linha.", search: "manejo água vazão nipple pressão bebedouro frango de corte" },
  ]},
  { id: "biosseguridade", title: "Biosseguridade, cama e sanidade", description: "Barreiras sanitárias, limpeza, cama, prevenção e observação diária.", lessons: [
    { id: "b1", title: "Biosseguridade na granja", duration: "18 min", summary: "Revise controle de acesso, fluxo de pessoas e veículos, higiene, vazio sanitário e registros.", search: "biosseguridade granjas avícolas frango de corte Embrapa aula" },
    { id: "b2", title: "Manejo da cama de aviário", duration: "16 min", summary: "Entenda a função da cama, umidade, empastamento, revolvimento, tratamento e destinação adequada.", search: "Embrapa boas práticas manejo cama aviário curso" },
  ]},
  { id: "monitoramento", title: "Monitoramento zootécnico e tomada de decisão", description: "Pesagem, mortalidade, uniformidade, consumo e leitura de indicadores.", lessons: [
    { id: "m1", title: "Avaliação zootécnica do lote", duration: "18 min", summary: "Registre aves alojadas, mortalidade, eliminados, peso, uniformidade e consumo com datas e métodos consistentes.", search: "avaliação zootécnica lote frango de corte pesagem uniformidade aula" },
    { id: "m2", title: "Registros, metas e análise de desvios", duration: "15 min", summary: "Compare dados medidos com metas oficiais da linhagem e investigue desvios antes de tomar decisões.", search: "indicadores zootécnicos frango de corte conversão alimentar viabilidade GPD aula" },
  ]},
  { id: "pre-abate", title: "Bem-estar, pré-abate e gestão", description: "Bem-estar animal, apanha, transporte, custos e melhoria contínua.", lessons: [
    { id: "pa1", title: "Bem-estar e manejo pré-abate", duration: "18 min", summary: "Conheça princípios de manejo calmo, redução de estresse e cumprimento dos procedimentos aplicáveis.", search: "bem estar animal apanha transporte frango de corte aula" },
    { id: "pa2", title: "Gestão econômica e melhoria contínua", duration: "16 min", summary: "Relacione custo de ração, energia, mão de obra, mortalidade, desempenho e qualidade dos registros.", search: "custos de produção frangos de corte Embrapa curso" },
  ]},
];

const QUESTIONS = [
  { q: "Qual é a melhor prática ao comparar o desempenho de um lote?", a: ["Usar estimativas como se fossem medições", "Comparar registros datados e metas da linhagem correta", "Ignorar a idade das aves"], correct: 1 },
  { q: "Antes do alojamento, o aviário deve:", a: ["Ser preparado e checado conforme protocolo", "Receber aves assim que a cama estiver espalhada", "Dispensar verificação de água"], correct: 0 },
  { q: "Na primeira semana, é importante observar:", a: ["Somente o consumo total de ração", "Distribuição, atividade, acesso à água e papo", "Apenas a temperatura externa"], correct: 1 },
  { q: "A ambiência depende da interação entre:", a: ["Somente temperatura", "Temperatura, umidade, ar e condição das aves", "Somente iluminação"], correct: 1 },
  { q: "A vazão dos nipples deve ser verificada:", a: ["Em pontos representativos da linha", "Somente no início da linha", "Apenas quando houver mortalidade"], correct: 0 },
  { q: "Uma medida essencial de biosseguridade é:", a: ["Compartilhar equipamentos sem higienização", "Controlar acesso e cumprir higiene", "Permitir circulação livre"], correct: 1 },
  { q: "Dados ausentes em um relatório devem ser:", a: ["Preenchidos com zero", "Estimados sem identificação", "Identificados como não registrados"], correct: 2 },
  { q: "Para calcular ganho diário de peso com consistência, use:", a: ["Duas pesagens reais com intervalo conhecido", "Uma pesagem isolada", "Peso visual estimado"], correct: 0 },
  { q: "O manejo pré-abate deve priorizar:", a: ["Pressa acima de tudo", "Manejo calmo e procedimentos de bem-estar", "Suspender os registros"], correct: 1 },
  { q: "Quando um indicador sai da meta, o primeiro passo é:", a: ["Alterar vários ajustes ao mesmo tempo", "Conferir a medição, o contexto e investigar a causa", "Desconsiderar o resultado"], correct: 1 },
];

const STORAGE_KEY = "agrositiosp:academia-avicola:v1";
const allLessons = MODULES.flatMap((m) => m.lessons);

function CursoAviculturaPage() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string>("fundamentos");
  const [activeLesson, setActiveLesson] = useState<string>("f1");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { completed?: string[]; name?: string };
        setCompleted(Array.isArray(parsed.completed) ? parsed.completed.filter((id) => allLessons.some((l) => l.id === id)) : []);
        setName(typeof parsed.name === "string" ? parsed.name : "");
      }
    } catch { /* progresso local indisponível: curso continua utilizável */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed, name })); } catch { /* armazenamento pode estar bloqueado */ }
  }, [completed, name]);

  const progress = Math.round((completed.length / allLessons.length) * 100);
  const selected = allLessons.find((l) => l.id === activeLesson) ?? allLessons[0];
  const passed = score !== null && score >= 70;
  const eligible = completed.length === allLessons.length && passed && name.trim().length >= 3;
  const answered = Object.keys(answers).length;
  const moduleProgress = (id: string) => {
    const mod = MODULES.find((m) => m.id === id)!;
    return mod.lessons.filter((l) => completed.includes(l.id)).length;
  };

  const markComplete = (id: string) => setCompleted((old) => old.includes(id) ? old : [...old, id]);
  const finishAssessment = () => {
    if (answered !== QUESTIONS.length) return;
    const correct = QUESTIONS.reduce((sum, q, i) => sum + (answers[i] === q.correct ? 1 : 0), 0);
    setScore(correct * 10);
  };

  const issueCertificate = () => {
    if (!eligible) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const date = new Date().toLocaleDateString("pt-BR");
    const serial = "ASP-" + new Date().toISOString().slice(0, 10).replaceAll("-", "") + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    doc.setFillColor(18, 48, 39); doc.rect(0, 0, 297, 210, "F");
    doc.setDrawColor(205, 170, 92); doc.setLineWidth(1.2); doc.rect(9, 9, 279, 192);
    doc.setDrawColor(205, 170, 92); doc.setLineWidth(0.35); doc.rect(13, 13, 271, 184);
    doc.setTextColor(231, 211, 163); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text("AGRO SÍTIO SP  •  ACADEMIA AVÍCOLA", 148.5, 32, { align: "center" });
    doc.setTextColor(255, 255, 255); doc.setFontSize(29); doc.text("CERTIFICADO DE CONCLUSÃO", 148.5, 59, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(13); doc.text("Certificamos que", 148.5, 82, { align: "center" });
    doc.setFont("times", "bold"); doc.setFontSize(27); doc.setTextColor(231, 211, 163); doc.text(name.trim(), 148.5, 101, { align: "center", maxWidth: 240 });
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal"); doc.setFontSize(13);
    doc.text("concluiu a trilha de aprendizagem livre", 148.5, 118, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text("AVICULTURA DE CORTE", 148.5, 132, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    doc.text("16 aulas • 8 módulos • avaliação final aprovada", 148.5, 145, { align: "center" });
    doc.text("Aproveitamento: " + score + "%  |  Conclusão: " + date, 148.5, 155, { align: "center" });
    doc.setTextColor(231, 211, 163); doc.setFontSize(9); doc.text("Código de emissão: " + serial, 148.5, 174, { align: "center" });
    doc.setTextColor(230, 230, 230); doc.setFontSize(7);
    doc.text("Curso livre de caráter educativo. Certificado emitido pela plataforma Agro Sítio SP; não equivale a diploma técnico, graduação,", 148.5, 184, { align: "center" });
    doc.text("habilitação profissional regulamentada ou certificação oficial de órgão público/entidade acreditadora.", 148.5, 188, { align: "center" });
    doc.save("certificado-avicultura-de-corte.pdf");
  };

  const videoUrl = selected.videoId ? "https://www.youtube.com/embed/" + selected.videoId : null;
  const searchUrl = selected.search ? "https://www.youtube.com/results?search_query=" + encodeURIComponent(selected.search) : null;

  return <AppShell>
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-6 md:p-9 text-white">
        <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full border border-emerald-300/20" />
        <div className="relative max-w-3xl space-y-4">
          <Badge className="border-emerald-200/30 bg-emerald-200/10 text-emerald-100">ACADEMIA AVÍCOLA • FORMAÇÃO LIVRE</Badge>
          <div className="flex items-center gap-3"><GraduationCap className="h-9 w-9 text-amber-300" /><p className="text-sm uppercase tracking-[0.22em] text-emerald-100">Agro Sítio SP</p></div>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Curso profissional de<br className="hidden sm:block" /> avicultura de corte</h1>
          <p className="max-w-2xl text-sm leading-6 text-emerald-50/85 md:text-base">Uma trilha prática do pré-alojamento ao pré-abate, com videoaulas selecionadas, conteúdo técnico, avaliação e certificado de conclusão.</p>
          <div className="flex flex-wrap gap-4 text-xs text-emerald-100"><span className="flex items-center gap-1"><BookOpen className="h-4 w-4" />8 módulos • 16 aulas</span><span className="flex items-center gap-1"><Clock3 className="h-4 w-4" />aprox. 4h de conteúdo guiado</span><span className="flex items-center gap-1"><Award className="h-4 w-4" />avaliação + certificado</span></div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm text-muted-foreground">Seu progresso</p><p className="text-3xl font-bold tabular-nums">{progress}%</p></div><div className="rounded-xl bg-primary/10 p-3 text-primary"><GraduationCap className="h-7 w-7" /></div></div>
          <Progress value={progress} className="h-2.5" />
          <p className="text-xs text-muted-foreground">{completed.length} de {allLessons.length} aulas concluídas. O progresso fica salvo neste navegador e dispositivo.</p>
        </Card>
        <Card className="p-5 flex flex-col justify-center gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Critério de conclusão</div>
          <p className="text-sm text-muted-foreground">Concluir todas as aulas e obter pelo menos 70% na avaliação final para liberar o certificado.</p>
        </Card>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-4 min-w-0">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
              <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Aula selecionada</p><h2 className="text-lg font-semibold">{selected.title}</h2></div>
              <Badge variant={completed.includes(selected.id) ? "default" : "outline"}>{completed.includes(selected.id) ? "Concluída" : "Em andamento"}</Badge>
            </div>
            {videoUrl ? <div className="aspect-video bg-black"><iframe className="h-full w-full" src={videoUrl} title={selected.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div> : <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-muted/50 p-6 text-center"><CirclePlay className="h-12 w-12 text-primary" /><p className="font-medium">Videoaula recomendada</p><p className="max-w-md text-sm text-muted-foreground">Abra a busca do YouTube para encontrar aulas sobre este tema. Os vídeos permanecem hospedados pelos respectivos canais.</p>{searchUrl && <Button asChild><a href={searchUrl} target="_blank" rel="noreferrer">Buscar videoaulas <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}</div>}
            <div className="space-y-3 p-5">
              <p className="text-sm leading-6 text-muted-foreground">{selected.summary}</p>
              {selected.source && <p className="text-xs text-muted-foreground">Fonte: {selected.source} • conteúdo hospedado no YouTube.</p>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => markComplete(selected.id)} disabled={completed.includes(selected.id)}>{completed.includes(selected.id) ? <><CheckCircle2 className="mr-2 h-4 w-4" />Aula concluída</> : "Marcar aula como concluída"}</Button>
                {selected.videoId && <Button asChild variant="outline"><a href={"https://www.youtube.com/watch?v=" + selected.videoId} target="_blank" rel="noreferrer">Assistir no YouTube <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Conteúdo programático</h2><Badge variant="outline">{MODULES.length} módulos</Badge></div>
            <div className="space-y-2">
              {MODULES.map((mod, index) => {
                const open = expanded === mod.id;
                const done = moduleProgress(mod.id);
                return <div key={mod.id} className="overflow-hidden rounded-xl border border-border">
                  <button className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50" onClick={() => setExpanded(open ? "" : mod.id)}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{index + 1}</span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{mod.title}</span><span className="block text-xs text-muted-foreground">{done}/{mod.lessons.length} aulas • {mod.description}</span></span>
                    {done === mod.lessons.length ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {open && <div className="border-t border-border p-2">{mod.lessons.map((lesson) => <button key={lesson.id} onClick={() => setActiveLesson(lesson.id)} className={"flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors " + (activeLesson === lesson.id ? "bg-primary/10" : "hover:bg-muted/60")}>
                    {completed.includes(lesson.id) ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <CirclePlay className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{lesson.title}</span><span className="text-xs text-muted-foreground">{lesson.duration}</span></span>
                  </button>)}</div>}
                </div>;
              })}
            </div>
          </Card>
          <Card className="p-5 space-y-4" id="avaliacao">
            <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Avaliação final</h2></div>
            <p className="text-sm text-muted-foreground">Responda às 10 questões. É necessário acertar pelo menos 7 para aprovação. Você pode refazer a avaliação.</p>
            {QUESTIONS.map((q, i) => <div key={i} className="space-y-2 border-b border-border pb-4 last:border-0">
              <p className="text-sm font-semibold">{i + 1}. {q.q}</p>
              {q.a.map((option, j) => <label key={j} className="flex cursor-pointer items-start gap-2 rounded-lg p-2 text-sm hover:bg-muted/50"><input type="radio" name={"question-" + i} checked={answers[i] === j} onChange={() => { setAnswers((old) => ({ ...old, [i]: j })); setScore(null); }} className="mt-1 accent-primary" /><span>{option}</span></label>)}
            </div>)}
            <div className="flex flex-wrap items-center gap-3"><Button onClick={finishAssessment} disabled={answered !== QUESTIONS.length}>Corrigir avaliação ({answered}/10)</Button>{score !== null && <Badge variant={passed ? "default" : "destructive"}>{passed ? "Aprovado" : "Não aprovado"} • {score}%</Badge>}</div>
            {score !== null && <p className="text-sm text-muted-foreground">{passed ? "Parabéns! Sua avaliação foi aprovada." : "Revise os módulos e tente novamente. Você precisa de 70%."}</p>}
          </Card>
        </main>

        <aside className="space-y-4">
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2"><Award className="h-5 w-5 text-amber-500" /><h2 className="font-semibold">Certificado digital</h2></div>
            <p className="text-sm text-muted-foreground">Informe seu nome completo. O certificado em PDF será liberado após concluir todas as aulas e passar na avaliação.</p>
            <label className="text-xs font-medium" htmlFor="student-name">Nome completo</label>
            <Input id="student-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Digite seu nome completo" maxLength={90} />
            <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground space-y-1"><p>Aulas: {completed.length}/{allLessons.length}</p><p>Avaliação: {score === null ? "Pendente" : score + "%"} {passed ? "• aprovada" : ""}</p><p>Nome: {name.trim().length >= 3 ? "informado" : "pendente"}</p></div>
            <Button className="w-full" onClick={issueCertificate} disabled={!eligible}><Download className="mr-2 h-4 w-4" />Emitir certificado PDF</Button>
            {!eligible && <p className="text-xs text-muted-foreground">Complete as aulas, passe na avaliação e informe seu nome para liberar.</p>}
          </Card>
          <Card className="overflow-hidden">
            <div className="space-y-2 p-5">
              <div className="flex items-center gap-2"><CirclePlay className="h-5 w-5 text-primary" /><h3 className="font-semibold">Curso Avicultura na Prática — playlist completa</h3></div>
              <p className="text-sm text-muted-foreground">Playlist enviada por você, adicionada como conteúdo complementar da Academia Avícola. Assista às aulas diretamente aqui ou abra a lista completa no YouTube.</p>
              <Badge variant="outline">YouTube • playlist externa</Badge>
            </div>
            <div className="aspect-video bg-black">
              <iframe className="h-full w-full" src="https://www.youtube.com/embed/videoseries?list=PL8PskvJpL8J1RFxH2sNAYOXHp5WbWaOiL" title="Curso Avicultura na Prática — playlist do YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
            </div>
            <div className="p-4 pt-3">
              <a className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" href="https://youtube.com/playlist?list=PL8PskvJpL8J1RFxH2sNAYOXHp5WbWaOiL" target="_blank" rel="noreferrer">Abrir playlist completa no YouTube <ExternalLink className="h-4 w-4" /></a>
            </div>
          </Card>
          <Card className="p-5 space-y-3">
            <h3 className="font-semibold">Biblioteca técnica</h3>
            <p className="text-xs text-muted-foreground">Materiais complementares de instituições e canais externos. A disponibilidade e as regras de acesso são definidas pelos próprios sites.</p>
            <a className="flex items-center justify-between gap-2 text-sm text-primary hover:underline" href="https://www.atermaisdigital.cnptia.embrapa.br/web/frango" target="_blank" rel="noreferrer">Embrapa — Portal Frango <ExternalLink className="h-3.5 w-3.5" /></a>
            <a className="flex items-center justify-between gap-2 text-sm text-primary hover:underline" href="https://sistemafaeg.com.br/senar/cursos-e-treinamentos/avicultura-de-corte-tecnificada" target="_blank" rel="noreferrer">Senar — Avicultura tecnificada <ExternalLink className="h-3.5 w-3.5" /></a>
            <a className="flex items-center justify-between gap-2 text-sm text-primary hover:underline" href="https://eaulas.usp.br/portal/home" target="_blank" rel="noreferrer">USP — e-Aulas Produção de Aves <ExternalLink className="h-3.5 w-3.5" /></a>
            <a className="flex items-center justify-between gap-2 text-sm text-primary hover:underline" href="https://www.youtube.com/watch?v=egxTH2SEsJY" target="_blank" rel="noreferrer">Bruno Crepaldi — Avicultura na prática <ExternalLink className="h-3.5 w-3.5" /></a>
          </Card>
          <Card className="p-4 space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Importante</p>
            <p className="text-xs leading-5 text-muted-foreground">Curso livre de caráter educativo. Não substitui treinamento presencial obrigatório, assistência de médico-veterinário ou zootecnista, protocolos da integração, manuais da linhagem nem exigências legais. O certificado comprova a conclusão desta trilha na plataforma, sem reconhecimento automático por conselho profissional ou órgão público.</p>
          </Card>
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => { if (window.confirm("Deseja apagar o progresso salvo neste navegador?")) { setCompleted([]); setAnswers({}); setScore(null); } }}><RotateCcw className="mr-2 h-4 w-4" />Reiniciar progresso</Button>
        </aside>
      </div>
    </div>
  </AppShell>;
}
