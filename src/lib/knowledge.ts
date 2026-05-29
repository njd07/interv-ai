import dsaData from "../knowledge/dsa.md?raw";
import springbootData from "../knowledge/springboot.md?raw";
import systemDesignData from "../knowledge/system_design.md?raw";
import lldData from "../knowledge/lld.md?raw";

export type Domain = "dsa" | "springboot" | "system_design" | "lld";

export const knowledgeBase: Record<Domain, string> = {
  dsa: dsaData,
  springboot: springbootData,
  system_design: systemDesignData,
  lld: lldData,
};

export const DOMAIN_META: Record<Domain, { title: string; tagline: string; short: string }> = {
  dsa: { title: "DSA", tagline: "Data Structures & Algorithms", short: "DSA" },
  springboot: { title: "Spring Boot", tagline: "Java Backend Development", short: "Spring" },
  system_design: { title: "System Design", tagline: "Distributed Systems Architecture", short: "SysDesign" },
  lld: { title: "LLD", tagline: "Low-Level Design & OOP", short: "LLD" },
};

export function verifyKnowledge(): Record<Domain, boolean> {
  const out = {} as Record<Domain, boolean>;
  (Object.keys(knowledgeBase) as Domain[]).forEach((k) => {
    const ok = typeof knowledgeBase[k] === "string" && knowledgeBase[k].length > 500;
    out[k] = ok;
    // eslint-disable-next-line no-console
    console.log(`[knowledge:${k}]`, ok ? "OK" : "FAIL", knowledgeBase[k]?.slice(0, 100));
  });
  return out;
}
