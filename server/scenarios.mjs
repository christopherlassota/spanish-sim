export const scenarios = {
  restaurant: {
    id: "restaurant",
    title: "Restaurant in Mexico City",
    objective: "Order a meal and successfully ask for the bill in Spanish.",
    openingLine: "Buenas tardes. ¿Qué desean tomar?",
    stages: ["greeting", "order_drink", "order_food", "ask_bill", "close"],
    characters: {
      waiter: {
        name: "Carlos (Waiter)",
        tone: "impatient_but_professional",
        style: "brief, natural Mexican Spanish"
      },
      friend: {
        name: "Lucía (Friend)",
        tone: "supportive",
        style: "casual, encouraging"
      }
    }
  },
  taxi: {
    id: "taxi",
    title: "Taxi Ride in Bogotá",
    objective: "Tell the driver your destination, clarify route preference, and confirm payment.",
    openingLine: "Buenas, ¿a dónde vamos?",
    stages: ["greeting", "destination", "route", "payment", "close"],
    characters: {
      driver: {
        name: "Diego (Taxi Driver)",
        tone: "talkative",
        style: "friendly Colombian Spanish"
      }
    }
  },
  airbnb: {
    id: "airbnb",
    title: "Airbnb Check-in in Madrid",
    objective: "Check in, ask about apartment details, and report one issue politely.",
    openingLine: "Hola, soy Ana, tu anfitriona. ¿Todo bien con tu llegada?",
    stages: ["greeting", "checkin", "questions", "issue", "close"],
    characters: {
      host: {
        name: "Ana (Host)",
        tone: "helpful",
        style: "clear, polite Spanish from Spain"
      }
    }
  }
};
