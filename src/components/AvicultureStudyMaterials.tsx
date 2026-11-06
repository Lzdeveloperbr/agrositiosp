import { jsPDF } from "jspdf";
import { BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Chapter = { title: string; intro: string; sections: { heading: string; body: string; bullets?: string[] }[]; review: string[] };

const CHAPTERS: Chapter[] = [
  { title: "Fundamentos da avicultura de corte", intro: "Material de apoio para acompanhar as videoaulas da playlist Curso Avicultura na Prática. Estude os conceitos e compare-os com os procedimentos adotados na sua integração e na linhagem alojada.", sections: [
    { heading: "1. Cadeia produtiva", body: "A produção de frangos envolve genética e matrizes, incubatório, fábrica de ração, granja, transporte, abate e distribuição. O resultado final depende da integração entre essas etapas e da qualidade dos registros em cada uma delas.", bullets: ["Conheça as responsabilidades da integração e da equipe da granja.", "Registre alojamento, origem, linhagem, sexo quando aplicável e datas do lote.", "Mantenha rastreabilidade de ração, água, medicamentos, vacinação e ocorrências."] },
    { heading: "2. Linhagem e potencial zootécnico", body: "Linhagens comerciais possuem objetivos e manuais próprios de desempenho. Peso, consumo, conversão, viabilidade e uniformidade devem ser avaliados considerando idade, sexo, clima, manejo e especificação genética.", bullets: ["Use sempre o manual atualizado da linhagem realmente alojada.", "Não compare lotes sem considerar idade, sexo, densidade e condições de criação.", "Diferencie dado medido, estimativa e meta técnica."] },
    { heading: "3. Indicadores básicos", body: "Os indicadores ajudam a localizar desvios, mas não explicam sozinhos suas causas. Mortalidade, peso médio, ganho diário, consumo e conversão precisam de dados confiáveis e períodos claramente definidos.", bullets: ["Mortalidade acumulada = aves mortas acumuladas ÷ aves alojadas × 100.", "Ganho diário médio exige pesagens reais em duas datas e intervalo conhecido.", "Conversão alimentar exige consumo de ração e ganho de peso compatíveis no mesmo período."] }
  ], review: ["Quais etapas compõem a cadeia produtiva?", "Por que é necessário usar o manual da linhagem correta?", "Qual a diferença entre indicador e causa do problema?"] },
  { title: "Instalações, equipamentos e preparação do aviário", intro: "A preparação do galpão reduz riscos no alojamento e permite que os pintinhos encontrem água, ração e conforto desde a chegada.", sections: [
    { heading: "1. Estrutura e equipamentos", body: "O aviário pode reunir comedouros, linhas de nipple, silos, exaustores, entradas de ar, painéis evaporativos, sensores, aquecimento, iluminação e controlador ambiental. Cada componente deve estar limpo, funcional e corretamente ajustado.", bullets: ["Inspecione motores, correias, hélices, telas e entradas de ar.", "Confira sensores, alarmes, gerador e alimentação elétrica de emergência.", "Verifique vazamentos, altura e funcionamento dos bebedouros e comedouros."] },
    { heading: "2. Limpeza, desinfecção e vazio sanitário", body: "O protocolo deve seguir orientação veterinária, rótulo dos produtos e exigências da integração. A limpeza remove matéria orgânica; a desinfecção é etapa posterior e depende de superfície limpa, concentração, tempo de contato e segurança.", bullets: ["Retire resíduos e faça a limpeza na sequência definida no protocolo.", "Respeite diluição, tempo de contato, equipamentos de proteção e incompatibilidades químicas.", "Registre datas, produtos, lotes e responsáveis."] },
    { heading: "3. Pré-alojamento", body: "Antes da chegada, confirme cama em condição adequada, água disponível, linhas reguladas, ração acessível, aquecimento e ambiente estabilizado. A preparação deve considerar clima, estrutura e orientação técnica.", bullets: ["Teste água em diferentes pontos, inclusive no final das linhas.", "Confira distribuição de ração e acesso dos pintinhos aos equipamentos.", "Tenha checklist assinado e plano para falhas de energia ou equipamento."] }
  ], review: ["Qual a diferença entre limpeza e desinfecção?", "Por que testar o final da linha de água?", "Quais itens devem ser conferidos antes do alojamento?"] },
  { title: "Manejo inicial e primeira semana", intro: "A primeira semana exige observação frequente. O comportamento das aves é uma informação essencial para avaliar o conforto e o acesso aos recursos.", sections: [
    { heading: "1. Recepção dos pintinhos", body: "Avalie a qualidade do lote na chegada, distribuição no galpão, atividade, vocalização, acesso à água e ração e condições ambientais. Registre anormalidades e comunique rapidamente o responsável técnico.", bullets: ["Observe se as aves estão distribuídas de maneira uniforme.", "Confira funcionamento e acessibilidade dos bebedouros e comedouros.", "Registre mortalidade, refugagem e ocorrências desde o primeiro dia."] },
    { heading: "2. Papo e comportamento", body: "A avaliação do enchimento do papo, feita por amostragem e conforme protocolo, ajuda a verificar se os pintinhos encontraram água e alimento. Aves amontoadas, afastadas de fontes de calor ou ofegantes podem indicar desconforto.", bullets: ["Faça amostragens em diferentes áreas do galpão.", "Interprete comportamento junto com temperatura, umidade e circulação do ar.", "Corrija problemas conforme orientação técnica, evitando mudanças bruscas e simultâneas."] },
    { heading: "3. Crescimento inicial", body: "Peso e uniformidade devem ser avaliados por amostragem representativa, com balança conferida e método repetível. Compare os resultados com a meta apropriada para a linhagem e idade.", bullets: ["Pese aves de diferentes pontos do galpão.", "Anote tamanho da amostra, data, idade e equipamento utilizado.", "Investigue acesso à água, ração, temperatura e qualidade dos pintinhos diante de desvios."] }
  ], review: ["O que a distribuição das aves pode indicar?", "Por que avaliar o papo por amostragem?", "Como garantir que uma pesagem seja representativa?"] },
  { title: "Ambiência, ventilação e conforto térmico", intro: "Ambiência é o conjunto de condições físicas e de qualidade do ar que afetam conforto, saúde e desempenho. A regulagem deve respeitar idade, peso, clima, equipamento e orientação técnica.", sections: [
    { heading: "1. Temperatura e umidade", body: "Temperatura isolada não descreve todo o conforto térmico. Umidade relativa, velocidade do ar, densidade, comportamento e distribuição das aves também influenciam a sensação térmica.", bullets: ["Compare sensores com instrumento confiável e faça manutenção/calibração.", "Observe as aves em diferentes regiões e alturas do galpão.", "Não use uma única leitura como retrato de todo o aviário."] },
    { heading: "2. Ventilação", body: "Ventilação mínima renova o ar e ajuda a remover umidade e gases; ventilação de transição e túnel são estratégias aplicadas conforme a necessidade térmica e a capacidade do galpão. A pressão negativa depende da vedação e do dimensionamento das entradas de ar.", bullets: ["Verifique entradas de ar, vedação, pressão e funcionamento dos exaustores.", "Monitore qualidade do ar, cama e distribuição das aves.", "Ajustes devem seguir projeto, manual do controlador e assistência técnica."] },
    { heading: "3. Resfriamento e alarmes", body: "Painéis evaporativos e nebulização dependem das condições do ar e não substituem ventilação adequada. Alarmes devem ser tratados como sinal para investigar a causa, não simplesmente silenciados.", bullets: ["Confira sensores, abastecimento de água e drenagem.", "Observe se há umedecimento excessivo da cama.", "Mantenha plano de contingência para falta de energia e falhas de ventilação."] }
  ], review: ["Quais fatores influenciam o conforto além da temperatura?", "Qual a função da ventilação mínima?", "Por que alarmes não devem ser apenas silenciados?"] },
  { title: "Água, nutrição e alimentação", intro: "Água e ração sustentam o crescimento. Consumo fora do padrão pode ser sinal precoce de falha de equipamento, ambiente ou saúde.", sections: [
    { heading: "1. Água", body: "Avalie disponibilidade, qualidade, limpeza, pressão e vazão. A medição deve seguir o padrão recomendado pelo fabricante do equipamento e a idade das aves; não existe um único valor universal para todos os sistemas.", bullets: ["Colete amostras de água conforme orientação técnica.", "Meça vazão em pontos representativos e no final das linhas.", "Verifique altura, pressão, vazamentos e limpeza dos nipples."] },
    { heading: "2. Ração e fases", body: "Programas nutricionais são formulados para atender exigências por fase, linhagem e objetivo produtivo. Alterações de dieta, granulometria e fornecimento devem ser alinhadas com o nutricionista ou responsável técnico.", bullets: ["Confira identificação, lote, validade e integridade da ração.", "Evite misturar rações sem orientação.", "Registre entregas, consumo e sobras para detectar desvios."] },
    { heading: "3. Consumo e investigação", body: "Consumo de água e ração deve ser analisado junto com idade, clima, peso e histórico. Uma queda ou aumento inesperado exige conferência do medidor e investigação das condições do lote.", bullets: ["Registre leitura diária e horário padrão.", "Compare períodos equivalentes e considere temperatura ambiente.", "Investigue primeiro possíveis erros de leitura e falhas de equipamento."] }
  ], review: ["Por que medir a vazão no final da linha?", "Quem deve orientar alterações no programa nutricional?", "Quais fatores podem alterar o consumo?"] },
  { title: "Biosseguridade, cama e sanidade", intro: "Biosseguridade reúne medidas para reduzir a entrada e a disseminação de agentes infecciosos. A prevenção depende de rotina consistente e registros.", sections: [
    { heading: "1. Barreiras sanitárias", body: "Controle de acesso, higiene, troca de roupas e calçados, fluxo de pessoas, controle de pragas e limpeza de veículos e equipamentos reduzem riscos sanitários.", bullets: ["Restrinja visitas e registre entradas.", "Siga o fluxo limpo/sujo e os procedimentos de troca de roupa e calçado.", "Não compartilhe ferramentas sem limpeza e desinfecção conforme protocolo."] },
    { heading: "2. Cama", body: "A cama absorve umidade e contribui para o conforto das aves. Umidade excessiva, empastamento e crostas podem estar relacionados a vazamentos, ventilação insuficiente, densidade ou saúde intestinal.", bullets: ["Inspecione diferentes áreas, não apenas a entrada do galpão.", "Investigue a origem da umidade antes de realizar correções.", "Use os procedimentos autorizados para manejo, tratamento e destinação."] },
    { heading: "3. Saúde e mortalidade", body: "Observe diariamente atividade, fezes, respiração, locomoção, consumo e mortalidade. Diagnóstico e tratamento são atribuições de profissionais habilitados; não medique por tentativa.", bullets: ["Registre sinais, quantidade de aves afetadas e localização.", "Comunique rapidamente o responsável técnico.", "Siga programa sanitário, vacinação e legislação aplicáveis."] }
  ], review: ["Quais são exemplos de barreiras sanitárias?", "O que pode causar cama úmida?", "Por que não se deve medicar por tentativa?"] },
  { title: "Monitoramento zootécnico e tomada de decisão", intro: "Uma boa decisão começa com dados confiáveis. Registre o que foi medido, quando, como e em qual lote.", sections: [
    { heading: "1. Pesagem e uniformidade", body: "Amostras devem representar diferentes áreas e ser coletadas com método constante. A balança precisa estar conferida. Informe tamanho da amostra e condições da coleta.", bullets: ["Use amostra distribuída pelo galpão.", "Registre peso individual ou total, conforme método adotado.", "Compare apenas dados com períodos e métodos compatíveis."] },
    { heading: "2. Mortalidade e viabilidade", body: "Mantenha contagem diária de mortes e descartes separados quando o sistema exigir. Não transforme ausência de registro em zero. A definição de cada indicador precisa ser consistente.", bullets: ["Registre data e quantidade diária.", "Diferencie mortalidade, descarte e transferência.", "Confira o saldo de aves e a consistência dos lançamentos."] },
    { heading: "3. Análise de desvios", body: "Compare indicadores com metas oficiais e histórico comparável. Procure relações entre ambiente, água, ração, sanidade e desempenho. Evite alterar vários fatores ao mesmo tempo sem critério.", bullets: ["Confirme a medição antes de concluir que existe desvio.", "Identifique quando o problema começou e onde ocorre.", "Documente hipótese, ação tomada e resultado observado."] }
  ], review: ["O que torna uma amostra de pesagem representativa?", "Como tratar dias sem registro de mortalidade?", "Por que confirmar a medição antes de agir?"] },
  { title: "Bem-estar, pré-abate e gestão", intro: "A etapa final exige planejamento, manejo cuidadoso, cumprimento dos procedimentos oficiais e análise econômica do lote.", sections: [
    { heading: "1. Bem-estar", body: "Bem-estar envolve acesso a recursos, conforto, saúde e possibilidade de expressar comportamentos relevantes. Observe as aves e corrija riscos de lesão, estresse, fome, sede ou desconforto.", bullets: ["Mantenha equipamentos e instalações em boas condições.", "Evite ruídos, movimentos bruscos e manejo desnecessário.", "Siga os procedimentos de bem-estar e as orientações do responsável técnico."] },
    { heading: "2. Apanha e transporte", body: "Apanha, acondicionamento e transporte devem seguir legislação, protocolos da empresa e treinamento dos trabalhadores. Planejamento e comunicação reduzem atrasos e riscos às aves.", bullets: ["Organize equipe, equipamentos e horários com antecedência.", "Siga procedimentos aprovados para densidade e acondicionamento.", "Registre ocorrências e comunique não conformidades."] },
    { heading: "3. Gestão econômica", body: "O resultado econômico depende de receitas, custos e perdas. Ração, energia, mão de obra, cama, manutenção e mortalidade devem ser registrados com período e unidade claros.", bullets: ["Separe custos fixos e variáveis quando possível.", "Compare custo por ave e por quilo produzido usando a mesma base.", "Use dados reais para planejar melhorias e evitar decisões por impressão."] }
  ], review: ["Quais práticas ajudam a reduzir estresse no manejo?", "Por que planejar a apanha com antecedência?", "Quais custos devem ser acompanhados na granja?"] }
];

function addParagraph(doc: jsPDF, text: string, y: number, opts?: { bold?: boolean; size?: number }) {
  const size = opts?.size ?? 10;
  doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, 176);
  if (y + lines.length * 5 > 270) { doc.addPage(); y = 20; }
  doc.text(lines, 17, y);
  return y + lines.length * 5 + 3;
}

function makePdf(chapter: Chapter, index: number) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFillColor(20, 55, 43); doc.rect(0, 0, 210, 297, "F");
  doc.setTextColor(240, 222, 174); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("AGRO SÍTIO SP  |  ACADEMIA AVÍCOLA", 17, 24);
  doc.setTextColor(255, 255, 255); doc.setFontSize(23);
  const titleLines = doc.splitTextToSize(chapter.title, 176);
  doc.text(titleLines, 17, 65);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text("APOSTILA DE APOIO • MÓDULO " + String(index + 1).padStart(2, "0"), 17, 88);
  doc.setFontSize(9); doc.setTextColor(220, 232, 224);
  doc.text("Material complementar às videoaulas da playlist Curso Avicultura na Prática.", 17, 105);
  doc.text("Não é transcrição dos vídeos nem substitui orientação técnica.", 17, 112);
  doc.addPage();
  let y = 20;
  doc.setTextColor(25, 45, 36);
  y = addParagraph(doc, chapter.title, y, { bold: true, size: 18 });
  y = addParagraph(doc, chapter.intro, y, { size: 10 });
  chapter.sections.forEach((section) => {
    y = addParagraph(doc, section.heading, y + 4, { bold: true, size: 13 });
    y = addParagraph(doc, section.body, y);
    if (section.bullets) section.bullets.forEach((bullet) => { y = addParagraph(doc, "• " + bullet, y, { size: 9.5 }); });
  });
  y = addParagraph(doc, "Para revisar", y + 5, { bold: true, size: 13 });
  chapter.review.forEach((q, i) => { y = addParagraph(doc, (i + 1) + ". " + q, y, { size: 9.5 }); });
  y = addParagraph(doc, "Fontes e responsabilidade", y + 5, { bold: true, size: 12 });
  y = addParagraph(doc, "Apostila autoral de apoio didático elaborada para acompanhar a playlist indicada pelo aluno. Consulte os vídeos originais e os manuais oficiais da linhagem, protocolos da integração, legislação e orientação de médico-veterinário ou zootecnista. Parâmetros de manejo variam conforme linhagem, idade, instalação, clima e equipamento.", y, { size: 9 });
  y = addParagraph(doc, "Playlist: https://youtube.com/playlist?list=PL8PskvJpL8J1RFxH2sNAYOXHp5WbWaOiL", y, { size: 8 });
  doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  for (let p = 1; p <= doc.getNumberOfPages(); p++) { doc.setPage(p); doc.text("Agro Sítio SP • Material educativo • Página " + p + "/" + doc.getNumberOfPages(), 17, 288); }
  doc.save("apostila-modulo-" + String(index + 1).padStart(2, "0") + ".pdf");
}

export function AvicultureStudyMaterials() {
  const downloadAll = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    CHAPTERS.forEach((chapter, index) => {
      if (index > 0) doc.addPage();
      doc.setTextColor(25, 45, 36);
      let y = 20;
      y = addParagraph(doc, "MÓDULO " + (index + 1) + " — " + chapter.title, y, { bold: true, size: 16 });
      y = addParagraph(doc, chapter.intro, y);
      chapter.sections.forEach((section) => {
        y = addParagraph(doc, section.heading, y + 3, { bold: true, size: 12 });
        y = addParagraph(doc, section.body, y);
        section.bullets?.forEach((bullet) => { y = addParagraph(doc, "• " + bullet, y, { size: 9 }); });
      });
      y = addParagraph(doc, "Para revisar", y + 4, { bold: true, size: 12 });
      chapter.review.forEach((q, i) => { y = addParagraph(doc, (i + 1) + ". " + q, y, { size: 9 }); });
    });
    doc.save("apostila-completa-academia-avicola.pdf");
  };
  return <Card className="p-5 space-y-3">
    <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /><h3 className="font-semibold">Apostilas em PDF</h3></div>
    <p className="text-sm text-muted-foreground">Material de estudo para os 8 módulos, com explicações, rotinas de conferência e perguntas de revisão. Baixe tudo em um arquivo ou escolha um módulo.</p>
    <Button className="w-full" onClick={downloadAll}><Download className="mr-2 h-4 w-4" />Baixar apostila completa (8 módulos)</Button>
    <div className="grid gap-2 sm:grid-cols-2">
      {CHAPTERS.map((chapter, index) => <Button key={chapter.title} variant="outline" className="justify-start whitespace-normal text-left h-auto py-2" onClick={() => makePdf(chapter, index)}><Download className="mr-2 h-4 w-4 shrink-0" /><span className="text-xs">Módulo {index + 1} — {chapter.title}</span></Button>)}
    </div>
    <p className="text-xs text-muted-foreground">Material didático autoral complementar. Não reproduz nem transcreve os vídeos; use junto com a playlist e os manuais técnicos oficiais.</p>
  </Card>;
}
