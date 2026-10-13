/** Aviagen Ross 308 AP Broiler Performance Objectives 2022, as-hatched, metric.
 * Source table is distinct from the integrator's handwritten targets. */
export const ROSS_AP95_SOURCE = "https://aviagen.com/assets/Tech_Center/Ross_Broiler/RossxRoss308AP-BroilerPerformanceObjectives2022-EN.pdf";
export const ROSS_AP95_WEIGHTS = [44,62,80,101,125,151,181,214,250,289,333,379,429,483,540,601,665,732,803,876,953,1033,1115,1200,1287,1377,1468,1562,1657,1754,1853,1952,2053,2154,2257,2360,2463,2567,2671,2775,2879,2982,3086,3189,3291,3393,3493,3594,3693,3791,3888,3984,4079,4173,4265,4356,4446];
export const ROSS_AP95_FEED = [0,12,28,48,71,98,130,165,204,248,296,349,407,469,537,610,689,773,863,959,1060,1167,1280,1400,1525,1655,1792,1935,2083,2236,2396,2560,2730,2904,3084,3268,3457,3650,3848,4049,4254,4463,4674,4890,5108,5328,5552,5778,6005,6235,6467,6700,6935,7171,7408,7646,7884];
export const ROSS_AP95_PHOTO_TARGETS: Record<number, number> = {4:123,7:211,14:523,21:1036,28:1699,35:2446,42:3205};
export const dailyTable = (values: number[]) => Object.fromEntries(values.map((v, day) => [day, v]));