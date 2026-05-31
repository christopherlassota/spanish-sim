export const feedbackCalibrationFixtures = [
  {
    name: "english-heavy weak restaurant attempt",
    scenarioId: "restaurant",
    expectedBand: "A1",
    scoreRange: [35, 50],
    turns: [
      { role: "user", content: "the bill please and i want tacos" }
    ]
  },
  {
    name: "objective-complete developing restaurant attempt",
    scenarioId: "restaurant",
    expectedBand: "B1",
    scoreRange: [70, 80],
    turns: [
      { role: "user", content: "Hola, agua por favor" },
      { role: "user", content: "Quiero tacos por favor" },
      { role: "user", content: "La cuenta por favor gracias" }
    ]
  },
  {
    name: "polite varied strong restaurant attempt",
    scenarioId: "restaurant",
    expectedBand: "B2",
    scoreRange: [85, 92],
    turns: [
      { role: "user", content: "Buenas tardes, me gustaría tomar agua mineral, por favor." },
      { role: "user", content: "También quiero el plato de enchiladas con salsa verde." },
      { role: "user", content: "¿Me podría traer la cuenta? Prefiero pagar con tarjeta. Muchas gracias." }
    ]
  }
];
