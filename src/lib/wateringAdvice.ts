export interface RainHistory {
  dryDays: number;
  totalPrecipitation: number;
  lastThreeDays?: number;
  location_source?: string;
}
export function wateringAdvice(
  rain: RainHistory | null | undefined,
  temperature: number | undefined,
) {
  if (
    !rain || !Number.isFinite(rain.lastThreeDays) ||
    !Number.isFinite(temperature)
  ) {
    return {
      title: "Känn på jorden före vattning",
      detail: "Tillräckligt väderunderlag saknas för ett vattningsråd.",
    };
  }
  const mm = rain.lastThreeDays!.toLocaleString("sv-SE", {
    maximumFractionDigits: 1,
  });
  if (rain.location_source !== "saved") {
    return {
      title: "Ange plats för lokala vattningsråd",
      detail:
        "Zonens regionala väder är för grovt för att avgöra om dina bäddar behöver vatten.",
    };
  }
  if (temperature! <= 3) {
    return {
      title: "Avvakta med vattning vid kyla",
      detail:
        `Vädermodellen anger ${mm} mm nederbörd de senaste tre avslutade dygnen. Vattna inte frusen jord.`,
    };
  }
  if (rain.lastThreeDays! >= 10) {
    return {
      title: "Hoppa över om jorden fortfarande är fuktig",
      detail:
        `Vädermodellen anger ${mm} mm nederbörd de senaste tre avslutade dygnen. Kontrollera jorden några centimeter ner.`,
    };
  }
  if (rain.dryDays >= 3 && temperature! >= 20) {
    return {
      title: "Vattna i dag om jorden är torr",
      detail:
        `${rain.dryDays} torra dygn och ${mm} mm nederbörd de senaste tre dygnen. Vattna ordentligt vid rötterna när det är svalare.`,
    };
  }
  return {
    title: "Kontrollera jorden i dag",
    detail:
      `${mm} mm nederbörd de senaste tre avslutade dygnen. Vattna bara om jorden är torr under ytan.`,
  };
}
