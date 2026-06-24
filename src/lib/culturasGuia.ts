// Base de conhecimento de culturas para AgroSítio
// Fontes: Embrapa, IAC, manuais de aduba\u00e7\u00e3o (valores m\u00e9dios de refer\u00eancia)

export type CulturaGuia = {
  id: string;
  nome: string;
  emoji: string;
  ciclo: string;
  // Aduba\u00e7\u00e3o em kg/ha (base de refer\u00eancia para produtividade m\u00e9dia)
  npk: {
    n: number;
    p2o5: number;
    k2o: number;
    produtividadeRef: string; // ex "60 sc/ha"
    obs: string;
  };
  calagem: string;
  espacamento: string;
  populacao: string;
  sementesPorHa: string;
  preparoSolo: string[];
  plantio: string[];
  tratos: string[];
  pragas: string[];
  colheita: {
    pontoIdeal: string[];
    umidadeIdeal: string;
    sinais: string[];
  };
};

export const CULTURAS_GUIA: CulturaGuia[] = [
  {
    id: "milho",
    nome: "Milho",
    emoji: "🌽",
    ciclo: "120-150 dias",
    npk: {
      n: 150,
      p2o5: 90,
      k2o: 90,
      produtividadeRef: "150 sc/ha (9 t/ha)",
      obs: "30 kg N na semeadura + 120 kg N em cobertura (V4 e V8). Aumentar K em solos arenosos.",
    },
    calagem: "Elevar V% para 60%. Aplicar calc\u00e1rio 60-90 dias antes do plantio.",
    espacamento: "0,45 a 0,80 m entre linhas",
    populacao: "60.000 a 75.000 plantas/ha",
    sementesPorHa: "18-22 kg/ha (3,5-4,5 sementes/m linear)",
    preparoSolo: [
      "Dessecação (glifosato) 15-20 dias antes se SPD",
      "Convencional: 1 arado/tombador a 25-30 cm",
      "1-2 passadas de grade niveladora",
      "Sulcador na linha de plantio (10-15 cm)",
    ],
    plantio: [
      "Profundidade 3-5 cm",
      "Plantar com solo umido (capacidade de campo)",
      "Aduba\u00e7\u00e3o de base junto \u00e0 semente: 250-350 kg/ha de 08-28-16",
    ],
    tratos: [
      "Cobertura N: ureia 200-260 kg/ha em V4 e V8",
      "Herbicida p\u00f3s: atrazina + tembotriona em V3-V5",
      "Monitorar lagarta-do-cartucho (Spodoptera)",
    ],
    pragas: ["Lagarta-do-cartucho", "Cigarrinha-do-milho", "Percevejo barriga-verde"],
    colheita: {
      pontoIdeal: [
        "Gr\u00e3os com camada preta na base (linha negra)",
        "Palha amarelada e seca",
        "Esp\u00e1tica caindo (planta acamando palha)",
      ],
      umidadeIdeal: "18-22% (colheita mec.) · armazenamento 13-14%",
      sinais: ["Unhada no gr\u00e3o n\u00e3o marca", "Sabugo seco", "120+ dias ap\u00f3s emerg\u00eancia"],
    },
  },
  {
    id: "soja",
    nome: "Soja",
    emoji: "🫛",
    ciclo: "100-140 dias",
    npk: {
      n: 0,
      p2o5: 80,
      k2o: 80,
      produtividadeRef: "60 sc/ha (3,6 t/ha)",
      obs: "N\u00c3O aplicar N (fixa\u00e7\u00e3o biol\u00f3gica). Inocular sementes com Bradyrhizobium. Aplicar Co + Mo.",
    },
    calagem: "V% 60-70%. Calc\u00e1rio dolom\u00edtico para Mg.",
    espacamento: "0,40 a 0,50 m entre linhas",
    populacao: "240.000 a 320.000 plantas/ha",
    sementesPorHa: "50-65 kg/ha (12-16 sementes/m)",
    preparoSolo: [
      "Plantio direto preferido (palhada 4-6 t/ha)",
      "Dessecação 15 dias antes (glifosato + 2,4-D)",
      "Se convencional: arado + grade niveladora",
      "Subsolagem cada 3-4 anos se compactado",
    ],
    plantio: [
      "Profundidade 3-4 cm",
      "Inoculante obrigat\u00f3rio nas sementes",
      "Aduba\u00e7\u00e3o: 250-400 kg/ha de 02-20-20 ou 00-20-20",
    ],
    tratos: [
      "Herbicida p\u00f3s-emerg.: glifosato (RR) em V3-V4",
      "Fungicida preventivo p/ ferrugem em R1",
      "Monitorar percevejos a partir de R3",
    ],
    pragas: ["Lagarta-da-soja", "Helicoverpa", "Percevejo marrom", "Mosca-branca"],
    colheita: {
      pontoIdeal: [
        "Est\u00e1dio R8: 95% das vagens marrons",
        "Plantas sem folhas",
        "Gr\u00e3os soltos chacoalhando a vagem",
      ],
      umidadeIdeal: "13-15% (colheita) · 12% armazenamento",
      sinais: ["Vagens estalando", "Caule seco", "Gr\u00e3os duros (dente n\u00e3o marca)"],
    },
  },
  {
    id: "feijao",
    nome: "Feijão",
    emoji: "🫘",
    ciclo: "70-100 dias",
    npk: {
      n: 60,
      p2o5: 80,
      k2o: 60,
      produtividadeRef: "30 sc/ha (1,8 t/ha)",
      obs: "20 kg N base + 40 kg N cobertura aos 25 dias. Sens\u00edvel a salinidade.",
    },
    calagem: "V% 50-60%, evitar excesso (clorose).",
    espacamento: "0,40 a 0,50 m entre linhas",
    populacao: "200.000 a 250.000 plantas/ha",
    sementesPorHa: "60-80 kg/ha (10-15 sementes/m)",
    preparoSolo: [
      "Solo bem destorroado (semente pequena)",
      "1 ara\u00e7\u00e3o + 2 gradagens",
      "Sulco 5-8 cm",
    ],
    plantio: ["Profundidade 3-5 cm", "Tratamento de sementes c/ fungicida + inseticida"],
    tratos: ["Cobertura N aos 25 DAE", "Irriga\u00e7\u00e3o cr\u00edtica em floração e enchimento"],
    pragas: ["Mosca-branca", "Vaquinha", "Cigarrinha-verde", "Antracnose"],
    colheita: {
      pontoIdeal: [
        "90% das vagens secas e marrons",
        "Folhas amarelecidas e caindo",
      ],
      umidadeIdeal: "15-18% (arranquio) · 13% armazenamento",
      sinais: ["Vagens estalantes", "Sementes duras"],
    },
  },
  {
    id: "arroz",
    nome: "Arroz (sequeiro)",
    emoji: "🌾",
    ciclo: "110-130 dias",
    npk: {
      n: 90,
      p2o5: 70,
      k2o: 60,
      produtividadeRef: "60 sc/ha (3 t/ha)",
      obs: "30 kg N base + 60 kg N em cobertura (perfilhamento).",
    },
    calagem: "V% 50%.",
    espacamento: "0,30 a 0,40 m",
    populacao: "200 plantas/m²",
    sementesPorHa: "60-80 kg/ha",
    preparoSolo: ["Ara\u00e7\u00e3o 20-25 cm", "Gradagem niveladora", "Sulcador raso"],
    plantio: ["Profundidade 2-3 cm", "Solo \u00famido"],
    tratos: ["Herbicida pr\u00e9-emergente", "Cobertura N aos 30-45 DAE"],
    pragas: ["Brusone", "Percevejo-do-gr\u00e3o", "Lagarta-da-folha"],
    colheita: {
      pontoIdeal: ["2/3 dos gr\u00e3os do cacho maduros (marrom-amarelo)"],
      umidadeIdeal: "20-23% (colheita) · 13% armazenamento",
      sinais: ["Pan\u00edcula curvada", "Folhas secando"],
    },
  },
  {
    id: "cafe",
    nome: "Café",
    emoji: "☕",
    ciclo: "perene (1ª colheita 2-3 anos)",
    npk: {
      n: 300,
      p2o5: 60,
      k2o: 300,
      produtividadeRef: "30 sc/ha benef. (planta adulta)",
      obs: "Parcelar em 3-4 vezes (out, dez, fev). Adubo formulado 20-05-20 ou 20-00-20.",
    },
    calagem: "V% 60%, calc\u00e1rio dolom\u00edtico.",
    espacamento: "3,0 a 3,8 m entre ruas × 0,5 a 0,8 m entre plantas",
    populacao: "3.000 a 6.000 plantas/ha",
    sementesPorHa: "Mudas (n\u00e3o sementes diretas)",
    preparoSolo: [
      "Subsolagem cruzada 40-50 cm",
      "Calagem + gessagem 6 meses antes",
      "Covas 40×40×40 cm ou sulco",
      "Aduba\u00e7\u00e3o cova: 200g superfosfato + 5L esterco",
    ],
    plantio: ["Mudas com 4-6 pares de folhas", "Plantar no in\u00edcio das chuvas (out-dez)"],
    tratos: [
      "Roçada nas entrelinhas",
      "Poda esqueletamento a cada 5-7 anos",
      "Controle de bicho-mineiro e ferrugem",
    ],
    pragas: ["Broca-do-café", "Bicho-mineiro", "Ferrugem", "Cercospora"],
    colheita: {
      pontoIdeal: [
        "70%+ dos frutos cereja (vermelhos)",
        "Menos de 20% verdes",
        "Frutos secos (passa) <10%",
      ],
      umidadeIdeal: "11-12% (ap\u00f3s secagem para armazenar)",
      sinais: ["Fruto sai f\u00e1cil ao apertar", "Cor vermelho-cereja uniforme"],
    },
  },
  {
    id: "cana",
    nome: "Cana-de-açúcar",
    emoji: "🎋",
    ciclo: "12-18 meses (cana planta)",
    npk: {
      n: 100,
      p2o5: 120,
      k2o: 150,
      produtividadeRef: "90-120 t/ha",
      obs: "Soqueira: aumentar N para 120-150 kg/ha. Vinha\u00e7a substitui K.",
    },
    calagem: "V% 60%.",
    espacamento: "1,4 a 1,5 m entre sulcos",
    populacao: "12-18 gemas/m",
    sementesPorHa: "10-15 t/ha de toletes",
    preparoSolo: [
      "Subsolagem 40-50 cm",
      "1 ara\u00e7\u00e3o + 2 gradagens",
      "Sulcação 25-30 cm",
    ],
    plantio: ["Toletes com 2-3 gemas", "Cobrir com 5-8 cm de terra"],
    tratos: [
      "Cultivo entre linhas no perfilhamento",
      "Maturadores 45-60 dias antes da colheita",
    ],
    pragas: ["Broca-da-cana", "Cigarrinha", "Migdolus", "Ferrugem"],
    colheita: {
      pontoIdeal: [
        "Brix do colmo \u2265 18%",
        "PCC (po\u00e7a\u00e7\u00fa) \u2265 13%",
        "Folhas inferiores secas",
      ],
      umidadeIdeal: "—",
      sinais: ["Colmo lustroso", "Pouca diferen\u00e7a de Brix base/ponta"],
    },
  },
  {
    id: "trigo",
    nome: "Trigo",
    emoji: "🌾",
    ciclo: "110-130 dias",
    npk: {
      n: 90,
      p2o5: 60,
      k2o: 50,
      produtividadeRef: "50 sc/ha (3 t/ha)",
      obs: "20 kg N base + 70 kg N cobertura no perfilhamento.",
    },
    calagem: "V% 60%.",
    espacamento: "0,17 a 0,20 m",
    populacao: "300-400 plantas/m²",
    sementesPorHa: "120-150 kg/ha",
    preparoSolo: ["SPD recomendado", "Se convencional: grade + niveladora"],
    plantio: ["Profundidade 3-5 cm", "Plantar maio-julho (Sul/SE)"],
    tratos: ["Fungicida p/ giberela e ferrugem", "Cobertura N aos 30 DAE"],
    pragas: ["Ferrugem", "Giberela", "Pulg\u00e3o", "Lagarta"],
    colheita: {
      pontoIdeal: ["Espiga curvada", "Gr\u00e3os duros (n\u00e3o marca unha)"],
      umidadeIdeal: "13-15%",
      sinais: ["Planta amarela-palha", "Espigueta seca"],
    },
  },
  {
    id: "algodao",
    nome: "Algodão",
    emoji: "☁️",
    ciclo: "160-200 dias",
    npk: {
      n: 120,
      p2o5: 90,
      k2o: 120,
      produtividadeRef: "280 @/ha (4,2 t/ha caro\u00e7o)",
      obs: "30 kg N base + 90 kg N parcelado em 2-3 coberturas.",
    },
    calagem: "V% 60%.",
    espacamento: "0,76 a 0,90 m",
    populacao: "80.000 a 110.000 plantas/ha",
    sementesPorHa: "15-20 kg/ha",
    preparoSolo: ["Subsolagem", "Ara\u00e7\u00e3o 25-30 cm", "Gradagem fina"],
    plantio: ["Profundidade 3-5 cm"],
    tratos: ["Reguladores de crescimento (mepiquat)", "Controle r\u00edgido de bicudo"],
    pragas: ["Bicudo", "Lagarta-rosada", "Mosca-branca", "Ramul\u00e1ria"],
    colheita: {
      pontoIdeal: ["60-70% capulhos abertos", "Desfolha qu\u00edmica para mecanizada"],
      umidadeIdeal: "10-12%",
      sinais: ["Capulhos brancos abertos e secos"],
    },
  },
  {
    id: "tomate",
    nome: "Tomate",
    emoji: "🍅",
    ciclo: "100-130 dias",
    npk: {
      n: 200,
      p2o5: 400,
      k2o: 300,
      produtividadeRef: "80-100 t/ha",
      obs: "Aduba\u00e7\u00e3o de plantio + fertirriga\u00e7\u00e3o semanal. Ca e Mg para evitar fundo-preto.",
    },
    calagem: "V% 70-80%.",
    espacamento: "1,0 × 0,5 m (tutorado)",
    populacao: "18.000-25.000 plantas/ha",
    sementesPorHa: "Mudas (200-400 g/ha de sementes em sementeira)",
    preparoSolo: [
      "Aração + gradagem fina",
      "Canteiros 20-30 cm altura",
      "Esterco curtido 30-50 t/ha",
    ],
    plantio: ["Mudas com 25-30 dias", "Tutoramento ao 15º dia"],
    tratos: ["Desbrota semanal", "Pulveriza\u00e7\u00e3o preventiva (requeima)"],
    pragas: ["Tra\u00e7a-do-tomateiro", "Mosca-branca", "Requeima", "\u00c1caro"],
    colheita: {
      pontoIdeal: ["Mercado pr\u00f3ximo: vermelho maduro", "Distante: pintado/de vez"],
      umidadeIdeal: "—",
      sinais: ["Cor uniforme", "Firme ao toque", "Desprende f\u00e1cil do ped\u00fanculo"],
    },
  },
  {
    id: "mandioca",
    nome: "Mandioca",
    emoji: "🥔",
    ciclo: "8-18 meses",
    npk: {
      n: 60,
      p2o5: 80,
      k2o: 120,
      produtividadeRef: "25-40 t/ha",
      obs: "K alto \u00e9 essencial. Aduba\u00e7\u00e3o base + cobertura aos 60-90 dias.",
    },
    calagem: "V% 50%.",
    espacamento: "1,0 × 0,6 m ou 0,9 × 0,8 m",
    populacao: "12.000-15.000 plantas/ha",
    sementesPorHa: "5-7 m³ de manivas (10.000 manivas/ha)",
    preparoSolo: [
      "Ara\u00e7\u00e3o profunda 25-30 cm",
      "Gradagem niveladora",
      "Solo solto favorece raiz",
    ],
    plantio: ["Manivas 15-20 cm c/ 5-7 gemas", "Plantar deitada 5-10 cm prof."],
    tratos: ["Capinas at\u00e9 fechamento (3-4 meses)", "Controle de mandarov\u00e1"],
    pragas: ["Mandarov\u00e1", "\u00c1caro verde", "Mosca-branca", "Podrid\u00e3o-radicular"],
    colheita: {
      pontoIdeal: ["8-12 meses (mesa)", "14-18 meses (ind\u00fastria, mais amido)"],
      umidadeIdeal: "—",
      sinais: ["Folhas amareladas e caindo", "Ra\u00edzes destacam f\u00e1cil"],
    },
  },
];
