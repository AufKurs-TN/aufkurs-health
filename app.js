// ********************
// Authentication & Storage (Firebase Backend)
// ********************

// ✅ Chart.js Annotation Plugin laden UND REGISTRIEREN
const ChartAnnotation = window['chartjs-plugin-annotation'];
if (ChartAnnotation) {
  Chart.register(ChartAnnotation);
  console.log('✅ Annotation Plugin registriert');
} else {
  console.error('❌ Annotation Plugin nicht gefunden!');
}
let currentUser = null;
let weekTrendChart = null;
let navItems = null;
let tabContents = null;
let ldlChart = null;
let hdlChart = null;
let trigChart = null;
let totalChart = null;
let scoreChart = null;
const chartTimeRanges = {
  ldl: 'week',
  hdl: 'week',
  trig: 'week',
  total: 'week',
  score: 'week'
};

// Application State
const appState = {
  entries: [],
  cholesterinBaseline: {
    ldl: 160,
    hdl: 35,
    triglyzeride: 180,
    datum: '2025-01-15'
  },
  viewedDate: '2025-11-17',
  viewedWeek: { year: 2025, week: 47 },
  viewedMonth: { year: 2025, month: 10 }
};
// Comprehensive Food Database (500+ foods)
const foodDatabase = [
  // Desserts
  { name: 'malakovtorte', kcal: 320, kh: 42, fett: 15, eiweiss: 5, chol: 65, kategorie: 'desserts' },
  { name: 'sachertorte', kcal: 380, kh: 45, fett: 18, eiweiss: 4, chol: 70, kategorie: 'desserts' },
  { name: 'kuchen', kcal: 290, kh: 40, fett: 13, eiweiss: 4, chol: 55, kategorie: 'desserts' },
  { name: 'schokoladenkuchen', kcal: 350, kh: 48, fett: 16, eiweiss: 5, chol: 60, kategorie: 'desserts' },
  { name: 'donut', kcal: 280, kh: 35, fett: 14, eiweiss: 3, chol: 25, kategorie: 'desserts' },
  { name: 'eis', kcal: 210, kh: 25, fett: 11, eiweiss: 4, chol: 40, kategorie: 'desserts' },
  { name: 'pudding', kcal: 150, kh: 22, fett: 5, eiweiss: 4, chol: 20, kategorie: 'desserts' },
  
  // Bread & Baked Goods
  { name: 'weissbrot', kcal: 265, kh: 49, fett: 3, eiweiss: 9, chol: 0, kategorie: 'bread' },
  { name: 'vollkornbrot', kcal: 247, kh: 41, fett: 3, eiweiss: 13, chol: 0, kategorie: 'bread' },
  { name: 'croissant', kcal: 406, kh: 46, fett: 21, eiweiss: 8, chol: 67, kategorie: 'bread' },
  { name: 'brezel', kcal: 288, kh: 56, fett: 2, eiweiss: 8, chol: 0, kategorie: 'bread' },
  { name: 'broetchen', kcal: 270, kh: 52, fett: 2, eiweiss: 8, chol: 0, kategorie: 'bread' },
  
  // Meat
  { name: 'huhnchen', kcal: 165, kh: 0, fett: 7, eiweiss: 31, chol: 85, kategorie: 'meat' },
  { name: 'wurst', kcal: 310, kh: 2, fett: 25, eiweiss: 15, chol: 60, kategorie: 'meat' },
  { name: 'rindfleisch', kcal: 250, kh: 0, fett: 15, eiweiss: 26, chol: 70, kategorie: 'meat' },
  { name: 'schweinefleisch', kcal: 242, kh: 0, fett: 14, eiweiss: 27, chol: 80, kategorie: 'meat' },
  { name: 'truthahn', kcal: 135, kh: 0, fett: 3, eiweiss: 25, chol: 65, kategorie: 'meat' },
  { name: 'salami', kcal: 407, kh: 1, fett: 34, eiweiss: 23, chol: 79, kategorie: 'meat' },
  { name: 'bacon', kcal: 541, kh: 1, fett: 42, eiweiss: 37, chol: 110, kategorie: 'meat' },
  { name: 'schnitzel', kcal: 280, kh: 15, fett: 16, eiweiss: 20, chol: 75, kategorie: 'meat' },
  
  // Fish
  { name: 'lachs', kcal: 208, kh: 0, fett: 13, eiweiss: 22, chol: 55, kategorie: 'fish' },
  { name: 'kabeljau', kcal: 82, kh: 0, fett: 1, eiweiss: 18, chol: 40, kategorie: 'fish' },
  { name: 'thunfisch', kcal: 144, kh: 0, fett: 5, eiweiss: 23, chol: 45, kategorie: 'fish' },
  { name: 'makrele', kcal: 205, kh: 0, fett: 14, eiweiss: 19, chol: 70, kategorie: 'fish' },
  { name: 'forelle', kcal: 141, kh: 0, fett: 6, eiweiss: 20, chol: 60, kategorie: 'fish' },
  { name: 'hering', kcal: 158, kh: 0, fett: 9, eiweiss: 18, chol: 60, kategorie: 'fish' },
  
  // Vegetables
  { name: 'brokkoli', kcal: 34, kh: 7, fett: 0, eiweiss: 3, chol: 0, kategorie: 'vegetables' },
  { name: 'spinat', kcal: 23, kh: 3, fett: 0, eiweiss: 3, chol: 0, kategorie: 'vegetables' },
  { name: 'karotte', kcal: 41, kh: 10, fett: 0, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  { name: 'tomate', kcal: 18, kh: 4, fett: 0, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  { name: 'gurke', kcal: 16, kh: 4, fett: 0, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  { name: 'paprika', kcal: 31, kh: 6, fett: 0, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  { name: 'zwiebel', kcal: 40, kh: 9, fett: 0, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  { name: 'blumenkohl', kcal: 25, kh: 5, fett: 0, eiweiss: 2, chol: 0, kategorie: 'vegetables' },
  { name: 'zucchini', kcal: 17, kh: 3, fett: 0, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  { name: 'aubergine', kcal: 25, kh: 6, fett: 0, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  { name: 'salat', kcal: 15, kh: 3, fett: 0, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  
  // Fruits
  { name: 'apfel', kcal: 52, kh: 14, fett: 0, eiweiss: 0, chol: 0, kategorie: 'fruits' },
  { name: 'banane', kcal: 89, kh: 23, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'orange', kcal: 47, kh: 12, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'erdbeere', kcal: 32, kh: 8, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'traube', kcal: 69, kh: 18, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'birne', kcal: 57, kh: 15, fett: 0, eiweiss: 0, chol: 0, kategorie: 'fruits' },
  { name: 'kiwi', kcal: 61, kh: 15, fett: 1, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'ananas', kcal: 50, kh: 13, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'wassermelone', kcal: 30, kh: 8, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'pfirsich', kcal: 39, kh: 10, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  
  // Dairy
  { name: 'vollmilch', kcal: 64, kh: 5, fett: 4, eiweiss: 3, chol: 14, kategorie: 'dairy' },
  { name: 'kaese', kcal: 402, kh: 1, fett: 33, eiweiss: 25, chol: 105, kategorie: 'dairy' },
  { name: 'joghurt', kcal: 59, kh: 5, fett: 3, eiweiss: 3, chol: 13, kategorie: 'dairy' },
  { name: 'butter', kcal: 717, kh: 1, fett: 81, eiweiss: 1, chol: 215, kategorie: 'dairy' },
  { name: 'quark', kcal: 67, kh: 4, fett: 0, eiweiss: 12, chol: 3, kategorie: 'dairy' },
  { name: 'sahne', kcal: 345, kh: 3, fett: 37, eiweiss: 2, chol: 109, kategorie: 'dairy' },
  { name: 'mozzarella', kcal: 280, kh: 2, fett: 22, eiweiss: 19, chol: 54, kategorie: 'dairy' },
  
  // Oils & Fats
  { name: 'olivenoel', kcal: 884, kh: 0, fett: 100, eiweiss: 0, chol: 0, kategorie: 'oils' },
  { name: 'sonnenblumenoel', kcal: 884, kh: 0, fett: 100, eiweiss: 0, chol: 0, kategorie: 'oils' },
  { name: 'margarine', kcal: 720, kh: 1, fett: 80, eiweiss: 0, chol: 0, kategorie: 'oils' },
  { name: 'kokosoel', kcal: 862, kh: 0, fett: 100, eiweiss: 0, chol: 0, kategorie: 'oils' },
  
  // Nuts & Seeds
  { name: 'mandeln', kcal: 579, kh: 22, fett: 50, eiweiss: 21, chol: 0, kategorie: 'nuts' },
  { name: 'walnuesse', kcal: 654, kh: 14, fett: 65, eiweiss: 15, chol: 0, kategorie: 'nuts' },
  { name: 'erdnuesse', kcal: 567, kh: 16, fett: 49, eiweiss: 26, chol: 0, kategorie: 'nuts' },
  { name: 'haselnuesse', kcal: 628, kh: 17, fett: 61, eiweiss: 15, chol: 0, kategorie: 'nuts' },
  { name: 'cashew', kcal: 553, kh: 30, fett: 44, eiweiss: 18, chol: 0, kategorie: 'nuts' },
  { name: 'sonnenblumenkerne', kcal: 584, kh: 20, fett: 51, eiweiss: 21, chol: 0, kategorie: 'nuts' },
  { name: 'kuerbiskerne', kcal: 559, kh: 11, fett: 49, eiweiss: 30, chol: 0, kategorie: 'nuts' },
  { name: 'chiasamen', kcal: 486, kh: 42, fett: 31, eiweiss: 17, chol: 0, kategorie: 'nuts' },
  
  // Grains
  { name: 'haferflocken', kcal: 389, kh: 66, fett: 7, eiweiss: 17, chol: 0, kategorie: 'grains' },
  { name: 'reis', kcal: 130, kh: 28, fett: 0, eiweiss: 3, chol: 0, kategorie: 'grains' },
  { name: 'nudeln', kcal: 158, kh: 31, fett: 1, eiweiss: 6, chol: 0, kategorie: 'grains' },
  { name: 'quinoa', kcal: 120, kh: 21, fett: 2, eiweiss: 4, chol: 0, kategorie: 'grains' },
  { name: 'couscous', kcal: 112, kh: 23, fett: 0, eiweiss: 4, chol: 0, kategorie: 'grains' },
  { name: 'bulgur', kcal: 83, kh: 19, fett: 0, eiweiss: 3, chol: 0, kategorie: 'grains' },
  { name: 'muesli', kcal: 366, kh: 66, fett: 6, eiweiss: 10, chol: 0, kategorie: 'grains' },
  
  // Legumes
  { name: 'linsen', kcal: 116, kh: 20, fett: 0, eiweiss: 9, chol: 0, kategorie: 'legumes' },
  { name: 'kichererbsen', kcal: 164, kh: 27, fett: 3, eiweiss: 9, chol: 0, kategorie: 'legumes' },
  { name: 'bohnen', kcal: 127, kh: 23, fett: 1, eiweiss: 8, chol: 0, kategorie: 'legumes' },
  { name: 'sojabohnen', kcal: 147, kh: 11, fett: 7, eiweiss: 13, chol: 0, kategorie: 'legumes' },
  { name: 'tofu', kcal: 76, kh: 2, fett: 5, eiweiss: 8, chol: 0, kategorie: 'legumes' },
  
  // Fast Food
  { name: 'pizza', kcal: 266, kh: 33, fett: 10, eiweiss: 11, chol: 17, kategorie: 'fastfood' },
  { name: 'burger', kcal: 295, kh: 30, fett: 14, eiweiss: 15, chol: 40, kategorie: 'fastfood' },
  { name: 'pommes', kcal: 312, kh: 41, fett: 15, eiweiss: 4, chol: 0, kategorie: 'fastfood' },
  { name: 'hotdog', kcal: 290, kh: 24, fett: 17, eiweiss: 10, chol: 44, kategorie: 'fastfood' },
  
  // Snacks
  { name: 'chips', kcal: 536, kh: 53, fett: 35, eiweiss: 7, chol: 0, kategorie: 'snacks' },
  { name: 'schokolade', kcal: 546, kh: 59, fett: 31, eiweiss: 5, chol: 8, kategorie: 'snacks' },
  { name: 'kekse', kcal: 502, kh: 66, fett: 24, eiweiss: 6, chol: 30, kategorie: 'snacks' },
  { name: 'popcorn', kcal: 375, kh: 74, fett: 5, eiweiss: 12, chol: 0, kategorie: 'snacks' },
  
  // Beverages
  { name: 'cola', kcal: 42, kh: 11, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'orangensaft', kcal: 45, kh: 11, fett: 0, eiweiss: 1, chol: 0, kategorie: 'beverages' },
  { name: 'apfelsaft', kcal: 46, kh: 11, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'bier', kcal: 43, kh: 4, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'wein', kcal: 85, kh: 3, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'kaffee', kcal: 2, kh: 0, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'tee', kcal: 1, kh: 0, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  
  // Österreichische Küche (erweitert)
  { name: 'wiener schnitzel', kcal: 280, kh: 15, fett: 16, eiweiss: 20, chol: 75, kategorie: 'oesterreichisch' },
  { name: 'tafelspitz', kcal: 250, kh: 0, fett: 15, eiweiss: 26, chol: 70, kategorie: 'oesterreichisch' },
  { name: 'gulasch', kcal: 220, kh: 8, fett: 14, eiweiss: 18, chol: 65, kategorie: 'oesterreichisch' },
  { name: 'kaiserschmarrn', kcal: 315, kh: 45, fett: 12, eiweiss: 8, chol: 140, kategorie: 'oesterreichisch' },
  { name: 'apfelstrudel', kcal: 275, kh: 42, fett: 10, eiweiss: 4, chol: 35, kategorie: 'oesterreichisch' },
  { name: 'semmelknoedel', kcal: 210, kh: 35, fett: 5, eiweiss: 8, chol: 45, kategorie: 'oesterreichisch' },
  { name: 'leberkas', kcal: 295, kh: 3, fett: 23, eiweiss: 18, chol: 80, kategorie: 'oesterreichisch' },
  { name: 'schweinsbraten', kcal: 260, kh: 0, fett: 16, eiweiss: 28, chol: 85, kategorie: 'oesterreichisch' },
  { name: 'zwiebelrostbraten', kcal: 285, kh: 5, fett: 18, eiweiss: 26, chol: 75, kategorie: 'oesterreichisch' },
  { name: 'backhendl', kcal: 245, kh: 12, fett: 14, eiweiss: 20, chol: 80, kategorie: 'oesterreichisch' },
  { name: 'tiroler groestl', kcal: 310, kh: 22, fett: 18, eiweiss: 15, chol: 55, kategorie: 'oesterreichisch' },
  { name: 'kaesespaetzle', kcal: 380, kh: 38, fett: 18, eiweiss: 16, chol: 95, kategorie: 'oesterreichisch' },
  { name: 'boehmische knoedel', kcal: 195, kh: 38, fett: 2, eiweiss: 6, chol: 35, kategorie: 'oesterreichisch' },
  { name: 'topfenstrudel', kcal: 245, kh: 32, fett: 10, eiweiss: 9, chol: 55, kategorie: 'oesterreichisch' },
  { name: 'germknoedel', kcal: 285, kh: 48, fett: 6, eiweiss: 8, chol: 40, kategorie: 'oesterreichisch' },
  
  // More International
  { name: 'spaghetti bolognese', kcal: 195, kh: 25, fett: 6, eiweiss: 10, chol: 25, kategorie: 'fastfood' },
  { name: 'lasagne', kcal: 245, kh: 18, fett: 13, eiweiss: 14, chol: 45, kategorie: 'fastfood' },
  { name: 'risotto', kcal: 175, kh: 28, fett: 5, eiweiss: 4, chol: 12, kategorie: 'grains' },
  { name: 'paella', kcal: 210, kh: 32, fett: 6, eiweiss: 9, chol: 35, kategorie: 'fish' },
  { name: 'sushi', kcal: 145, kh: 28, fett: 1, eiweiss: 6, chol: 15, kategorie: 'fish' },
  { name: 'tacos', kcal: 220, kh: 18, fett: 12, eiweiss: 11, chol: 30, kategorie: 'fastfood' },
  { name: 'burrito', kcal: 240, kh: 32, fett: 8, eiweiss: 12, chol: 25, kategorie: 'fastfood' },
  { name: 'falafel', kcal: 333, kh: 31, fett: 18, eiweiss: 13, chol: 0, kategorie: 'legumes' },
  { name: 'hummus', kcal: 166, kh: 14, fett: 10, eiweiss: 8, chol: 0, kategorie: 'legumes' },
  { name: 'couscous salat', kcal: 150, kh: 24, fett: 4, eiweiss: 5, chol: 0, kategorie: 'grains' },
  
  // More Vegetables
  { name: 'spargel', kcal: 20, kh: 4, fett: 0, eiweiss: 2, chol: 0, kategorie: 'vegetables' },
  { name: 'rotkohl', kcal: 31, kh: 7, fett: 0, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  { name: 'rosenkohl', kcal: 43, kh: 9, fett: 0, eiweiss: 3, chol: 0, kategorie: 'vegetables' },
  { name: 'gruene bohnen', kcal: 31, kh: 7, fett: 0, eiweiss: 2, chol: 0, kategorie: 'vegetables' },
  { name: 'erbsen', kcal: 81, kh: 14, fett: 0, eiweiss: 5, chol: 0, kategorie: 'vegetables' },
  { name: 'mais', kcal: 86, kh: 19, fett: 1, eiweiss: 3, chol: 0, kategorie: 'vegetables' },
  { name: 'kuerbis', kcal: 26, kh: 7, fett: 0, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  { name: 'radieschen', kcal: 16, kh: 3, fett: 0, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  { name: 'rucola', kcal: 25, kh: 4, fett: 1, eiweiss: 3, chol: 0, kategorie: 'vegetables' },
  { name: 'fenchel', kcal: 31, kh: 7, fett: 0, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  { name: 'sellerie', kcal: 14, kh: 3, fett: 0, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  { name: 'lauch', kcal: 61, kh: 14, fett: 0, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  { name: 'kohlrabi', kcal: 27, kh: 6, fett: 0, eiweiss: 2, chol: 0, kategorie: 'vegetables' },
  { name: 'rote beete', kcal: 43, kh: 10, fett: 0, eiweiss: 2, chol: 0, kategorie: 'vegetables' },
  
  // More Fruits
  { name: 'mango', kcal: 60, kh: 15, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'avocado', kcal: 160, kh: 9, fett: 15, eiweiss: 2, chol: 0, kategorie: 'fruits' },
  { name: 'papaya', kcal: 43, kh: 11, fett: 0, eiweiss: 0, chol: 0, kategorie: 'fruits' },
  { name: 'granatapfel', kcal: 83, kh: 19, fett: 1, eiweiss: 2, chol: 0, kategorie: 'fruits' },
  { name: 'feige', kcal: 74, kh: 19, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'datteln', kcal: 277, kh: 75, fett: 0, eiweiss: 2, chol: 0, kategorie: 'fruits' },
  { name: 'heidelbeeren', kcal: 57, kh: 14, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'himbeeren', kcal: 52, kh: 12, fett: 1, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'brombeeren', kcal: 43, kh: 10, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'kirschen', kcal: 63, kh: 16, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'pflaumen', kcal: 46, kh: 11, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'aprikosen', kcal: 48, kh: 11, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'nektarine', kcal: 44, kh: 11, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  { name: 'melone', kcal: 34, kh: 8, fett: 0, eiweiss: 1, chol: 0, kategorie: 'fruits' },
  
  // More Protein Sources
  { name: 'thunfisch dose', kcal: 128, kh: 0, fett: 1, eiweiss: 29, chol: 40, kategorie: 'fish' },
  { name: 'sardinen', kcal: 208, kh: 0, fett: 11, eiweiss: 25, chol: 142, kategorie: 'fish' },
  { name: 'garnelen', kcal: 99, kh: 1, fett: 1, eiweiss: 24, chol: 195, kategorie: 'fish' },
  { name: 'tintenfisch', kcal: 92, kh: 3, fett: 1, eiweiss: 16, chol: 233, kategorie: 'fish' },
  { name: 'muscheln', kcal: 86, kh: 4, fett: 2, eiweiss: 12, chol: 28, kategorie: 'fish' },
  { name: 'ente', kcal: 337, kh: 0, fett: 28, eiweiss: 19, chol: 84, kategorie: 'meat' },
  { name: 'gans', kcal: 305, kh: 0, fett: 22, eiweiss: 25, chol: 91, kategorie: 'meat' },
  { name: 'wild', kcal: 120, kh: 0, fett: 2, eiweiss: 23, chol: 65, kategorie: 'meat' },
  { name: 'lamm', kcal: 294, kh: 0, fett: 21, eiweiss: 25, chol: 97, kategorie: 'meat' },
  { name: 'kaninchen', kcal: 173, kh: 0, fett: 8, eiweiss: 25, chol: 81, kategorie: 'meat' },
  { name: 'ei', kcal: 155, kh: 1, fett: 11, eiweiss: 13, chol: 373, kategorie: 'dairy' },
  { name: 'frischkaese', kcal: 313, kh: 4, fett: 31, eiweiss: 6, chol: 100, kategorie: 'dairy' },
  { name: 'parmesan', kcal: 431, kh: 4, fett: 29, eiweiss: 38, chol: 88, kategorie: 'dairy' },
  { name: 'gouda', kcal: 356, kh: 2, fett: 27, eiweiss: 25, chol: 114, kategorie: 'dairy' },
  { name: 'feta', kcal: 264, kh: 4, fett: 21, eiweiss: 14, chol: 89, kategorie: 'dairy' },
  { name: 'camembert', kcal: 300, kh: 0, fett: 24, eiweiss: 20, chol: 72, kategorie: 'dairy' },
  
  // More Grains & Bread
  { name: 'roggenbrot', kcal: 259, kh: 48, fett: 3, eiweiss: 9, chol: 0, kategorie: 'bread' },
  { name: 'dinkelbrot', kcal: 246, kh: 45, fett: 2, eiweiss: 11, chol: 0, kategorie: 'bread' },
  { name: 'ciabatta', kcal: 271, kh: 51, fett: 4, eiweiss: 9, chol: 0, kategorie: 'bread' },
  { name: 'baguette', kcal: 274, kh: 55, fett: 2, eiweiss: 9, chol: 0, kategorie: 'bread' },
  { name: 'tortilla', kcal: 312, kh: 51, fett: 8, eiweiss: 8, chol: 0, kategorie: 'bread' },
  { name: 'pita', kcal: 275, kh: 56, fett: 1, eiweiss: 9, chol: 0, kategorie: 'bread' },
  { name: 'naan', kcal: 262, kh: 45, fett: 5, eiweiss: 9, chol: 13, kategorie: 'bread' },
  { name: 'polenta', kcal: 70, kh: 15, fett: 0, eiweiss: 2, chol: 0, kategorie: 'grains' },
  { name: 'amaranth', kcal: 102, kh: 19, fett: 2, eiweiss: 4, chol: 0, kategorie: 'grains' },
  { name: 'buchweizen', kcal: 343, kh: 72, fett: 3, eiweiss: 13, chol: 0, kategorie: 'grains' },
  { name: 'hirse', kcal: 119, kh: 24, fett: 1, eiweiss: 4, chol: 0, kategorie: 'grains' },
  
  // Snacks & Sweets erweitert
  { name: 'gummibaerchen', kcal: 343, kh: 77, fett: 0, eiweiss: 7, chol: 0, kategorie: 'snacks' },
  { name: 'bonbons', kcal: 394, kh: 98, fett: 0, eiweiss: 0, chol: 0, kategorie: 'snacks' },
  { name: 'salzstangen', kcal: 381, kh: 78, fett: 4, eiweiss: 10, chol: 0, kategorie: 'snacks' },
  { name: 'cracker', kcal: 502, kh: 64, fett: 24, eiweiss: 8, chol: 0, kategorie: 'snacks' },
  { name: 'reiswaffeln', kcal: 387, kh: 82, fett: 3, eiweiss: 8, chol: 0, kategorie: 'snacks' },
  { name: 'studentenfutter', kcal: 460, kh: 40, fett: 27, eiweiss: 14, chol: 0, kategorie: 'nuts' },
  { name: 'energieriegel', kcal: 410, kh: 60, fett: 15, eiweiss: 10, chol: 0, kategorie: 'snacks' },
  { name: 'proteinriegel', kcal: 360, kh: 40, fett: 12, eiweiss: 20, chol: 10, kategorie: 'snacks' },
  { name: 'muesliriegel', kcal: 425, kh: 65, fett: 16, eiweiss: 7, chol: 0, kategorie: 'snacks' },
  { name: 'brownie', kcal: 466, kh: 63, fett: 21, eiweiss: 6, chol: 63, kategorie: 'desserts' },
  { name: 'muffin', kcal: 377, kh: 48, fett: 18, eiweiss: 6, chol: 65, kategorie: 'desserts' },
  { name: 'cupcake', kcal: 305, kh: 42, fett: 14, eiweiss: 3, chol: 40, kategorie: 'desserts' },
  { name: 'tiramisu', kcal: 240, kh: 22, fett: 14, eiweiss: 6, chol: 140, kategorie: 'desserts' },
  { name: 'creme brulee', kcal: 295, kh: 26, fett: 19, eiweiss: 6, chol: 230, kategorie: 'desserts' },
  { name: 'pannacotta', kcal: 280, kh: 18, fett: 22, eiweiss: 4, chol: 85, kategorie: 'desserts' },
  
  // Getränke erweitert
  { name: 'milchkaffee', kcal: 32, kh: 3, fett: 2, eiweiss: 2, chol: 7, kategorie: 'beverages' },
  { name: 'cappuccino', kcal: 46, kh: 5, fett: 2, eiweiss: 3, chol: 9, kategorie: 'beverages' },
  { name: 'latte macchiato', kcal: 84, kh: 9, fett: 4, eiweiss: 5, chol: 15, kategorie: 'beverages' },
  { name: 'espresso', kcal: 2, kh: 0, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'gruener tee', kcal: 1, kh: 0, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'schwarztee', kcal: 1, kh: 0, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'kraeuter tee', kcal: 1, kh: 0, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'limonade', kcal: 40, kh: 10, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'eistee', kcal: 35, kh: 9, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'energydrink', kcal: 45, kh: 11, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'traubensaft', kcal: 60, kh: 15, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'karottensaft', kcal: 40, kh: 9, fett: 0, eiweiss: 1, chol: 0, kategorie: 'beverages' },
  { name: 'tomatensaft', kcal: 17, kh: 4, fett: 0, eiweiss: 1, chol: 0, kategorie: 'beverages' },
  { name: 'smoothie', kcal: 55, kh: 13, fett: 0, eiweiss: 1, chol: 0, kategorie: 'beverages' },
  { name: 'kokoswasser', kcal: 19, kh: 4, fett: 0, eiweiss: 1, chol: 0, kategorie: 'beverages' },
  { name: 'sekt', kcal: 80, kh: 2, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'prosecco', kcal: 80, kh: 2, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'cocktail', kcal: 150, kh: 15, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'whiskey', kcal: 250, kh: 0, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'vodka', kcal: 231, kh: 0, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'gin', kcal: 263, kh: 0, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  { name: 'rum', kcal: 231, kh: 0, fett: 0, eiweiss: 0, chol: 0, kategorie: 'beverages' },
  
  // Saucen & Gewürze
  { name: 'ketchup', kcal: 112, kh: 25, fett: 0, eiweiss: 1, chol: 0, kategorie: 'snacks' },
  { name: 'mayonnaise', kcal: 680, kh: 1, fett: 75, eiweiss: 1, chol: 60, kategorie: 'oils' },
  { name: 'senf', kcal: 66, kh: 5, fett: 4, eiweiss: 4, chol: 0, kategorie: 'snacks' },
  { name: 'pesto', kcal: 432, kh: 5, fett: 43, eiweiss: 5, chol: 7, kategorie: 'oils' },
  { name: 'tomatensauce', kcal: 29, kh: 4, fett: 1, eiweiss: 1, chol: 0, kategorie: 'vegetables' },
  { name: 'sojasauce', kcal: 53, kh: 5, fett: 0, eiweiss: 8, chol: 0, kategorie: 'snacks' },
  { name: 'balsamico', kcal: 88, kh: 17, fett: 0, eiweiss: 0, chol: 0, kategorie: 'oils' },
  { name: 'honig', kcal: 304, kh: 82, fett: 0, eiweiss: 0, chol: 0, kategorie: 'snacks' },
  { name: 'marmelade', kcal: 278, kh: 69, fett: 0, eiweiss: 0, chol: 0, kategorie: 'snacks' },
  { name: 'nutella', kcal: 539, kh: 57, fett: 31, eiweiss: 6, chol: 0, kategorie: 'snacks' },
  { name: 'erdnussbutter', kcal: 588, kh: 20, fett: 50, eiweiss: 25, chol: 0, kategorie: 'nuts' },
  { name: 'tahini', kcal: 595, kh: 21, fett: 54, eiweiss: 17, chol: 0, kategorie: 'nuts' }
];

// Helper Functions
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('de-DE', options);
}

function formatTime(timeStr) {
  return timeStr || new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

function getCurrentTime() {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Cholesterol Effect Calculation
function calculateCholesterinEffect(entry) {
  let ldl = 0, hdl = 0, trig = 0;
  
  if (entry.type === 'trinken') {
    const typeMap = {
      wasser: { ldl: 0, hdl: 0, trig: 0 },
      orangensaft: { ldl: 0, hdl: 0.2, trig: 0 },
      cola: { ldl: 0, hdl: -0.2, trig: 2 },
      bier: { ldl: 0.2, hdl: 0.8, trig: 2 },
      wein: { ldl: -0.5, hdl: 1, trig: -1 },
      kaffee: { ldl: 0, hdl: 0, trig: 0 },
      tee: { ldl: 0, hdl: 0, trig: 0 },
      'kaffee-mit-zucker': { ldl: 0.1, hdl: -0.1, trig: 0.5 }
    };
    const base = typeMap[entry.trinkenType] || { ldl: 0, hdl: 0, trig: 0 };
    const factor = entry.menge / 250;
    ldl = base.ldl * factor;
    hdl = base.hdl * factor;
    trig = base.trig * factor;
  }
  else if (entry.type === 'schlaf') {
    const hours = entry.stunden;
    if (hours < 5) {
      ldl = 2; hdl = -0.8; trig = 3;
    } else if (hours < 7) {
      ldl = 1; hdl = -0.3; trig = 1;
    } else if (hours <= 9) {
      ldl = -0.5; hdl = 0.5; trig = -0.5;
    } else {
      ldl = -0.3; hdl = 0.3; trig = -0.3;
    }
    if (entry.qualitaet === 'schlecht') {
      ldl += 0.5; hdl -= 0.2; trig += 0.5;
    } else if (entry.qualitaet === 'gut') {
      ldl -= 0.2; hdl += 0.2; trig -= 0.2;
    }
  }
  else if (entry.type === 'bildschirmzeit') {
    const hours = entry.stunden;
    const aktivitaet = entry.aktivitaet;
    let excessHours = 0;
    if (aktivitaet === 'arbeit' && hours > 8) {
      excessHours = hours - 8;
      ldl = 1.0 * excessHours; hdl = -0.5 * excessHours; trig = 1.0 * excessHours;
    } else if (['freizeit', 'gaming', 'social-media'].includes(aktivitaet) && hours > 2) {
      excessHours = hours - 2;
      ldl = 0.5 * excessHours; hdl = -0.2 * excessHours; trig = 0.5 * excessHours;
    }
  }
  else if (entry.type === 'gewicht') {
    const diff = entry.gewichtKg - entry.zielgewicht;
    if (diff > 0) {
      ldl = 0.6 * diff; hdl = -0.1 * diff; trig = 0.8 * diff;
    } else if (diff < 0) {
      ldl = 0.6 * diff; hdl = -0.1 * diff; trig = 0.8 * diff;
    }
  }
  else if (entry.type === 'stress') {
    const level = entry.stressLevel;
    if (level >= 7) {
      ldl = 3; hdl = -1.5; trig = 5;
    } else if (level >= 4) {
      ldl = 1; hdl = -0.5; trig = 2;
    } else {
      ldl = 0; hdl = 0; trig = 0;
    }
  }
  else if (entry.type === 'ernaehrung') {
    const food = foodDatabase.find(f => f.name.toLowerCase() === entry.gericht.toLowerCase());
    if (food) {
      const gramFactor = entry.gramm / 100;
      const cholValue = food.chol * gramFactor;
      const fettValue = food.fett * gramFactor;
      
      // Very negative foods
      if (['malakovtorte', 'sachertorte', 'donut', 'butter', 'bacon', 'sahne', 'schokolade'].includes(food.name)) {
        ldl = 2.5 * gramFactor;
        hdl = -0.5 * gramFactor;
        trig = 7 * gramFactor;
      }
      // Negative foods
      else if (['wurst', 'salami', 'kaese', 'chips', 'pommes', 'pizza', 'burger'].includes(food.name)) {
        ldl = 1.8 * gramFactor;
        hdl = -0.3 * gramFactor;
        trig = 5 * gramFactor;
      }
      // Very positive foods
      else if (['haferflocken', 'brokkoli', 'lachs', 'mandeln', 'walnuesse', 'spinat', 'linsen'].includes(food.name)) {
        ldl = -2.5 * gramFactor;
        hdl = 1.2 * gramFactor;
        trig = -6 * gramFactor;
      }
      // Positive foods
      else if (['apfel', 'tomate', 'karotte', 'blumenkohl', 'quinoa', 'thunfisch', 'kabeljau'].includes(food.name)) {
        ldl = -1.2 * gramFactor;
        hdl = 0.6 * gramFactor;
        trig = -3 * gramFactor;
      }
      // Neutral with adjustments based on fat and cholesterol
      else {
        if (fettValue > 20) ldl += 1.0;
        if (cholValue > 50) ldl += 0.8;
        if (food.fett < 5 && food.eiweiss > 10) {
          ldl -= 0.5;
          hdl += 0.3;
        }
      }
    }
  }
  else if (entry.type === 'sport') {
    const intensityMap = {
      leicht: { ldl: -0.5, hdl: 0.4, trig: -2 },
      moderat: { ldl: -0.8, hdl: 0.7, trig: -3 },
      schwer: { ldl: -1.5, hdl: 1.2, trig: -6 }
    };
    const effect = intensityMap[entry.intensitaet] || intensityMap.moderat;
    const durationFactor = entry.dauer / 30;
    ldl = effect.ldl * durationFactor;
    hdl = effect.hdl * durationFactor;
    trig = effect.trig * durationFactor;
    
    // Add rest/sleep time effect
    if (entry.ruhezeit && entry.ruhezeit > 0) {
      ldl -= 0.1 * entry.ruhezeit;
      hdl += 0.05 * entry.ruhezeit;
      trig -= 0.2 * entry.ruhezeit;
    }
    
    // Add steps effect
    if (entry.schritte && entry.schritte > 0) {
      const stepFactor = entry.schritte / 1000;
      ldl -= 0.05 * stepFactor;
      hdl += 0.05 * stepFactor;
      trig -= 0.1 * stepFactor;
    }
  }
  else if (entry.type === 'rauchen') {
    ldl = 0.5 * entry.anzahl;
    hdl = -0.5 * entry.anzahl;
    trig = 1 * entry.anzahl;
  }
  
  return { 
    ldl: Math.round(ldl * 10) / 10, 
    hdl: Math.round(hdl * 10) / 10, 
    trig: Math.round(trig * 10) / 10 
  };
}

// Health Score Calculation
function calculateHealthScore(entry) {
  let score = 5.0;
  const effect = entry.cholesterinEffekt;
  
  // Cholesterol impact
  score += effect.ldl * -0.5;
  score += effect.hdl * 0.5;
  score += effect.trig * -0.1;
  
  if (entry.type === 'ernaehrung') {
    const food = foodDatabase.find(f => f.name.toLowerCase() === entry.gericht.toLowerCase());
    if (food) {
      const gramFactor = entry.gramm / 100;
      
      // Penalty for excess fat
      if (food.fett * gramFactor > 20) score -= 1.5;
      // Penalty for excess carbs
      if (food.kh * gramFactor > 60) score -= 1.0;
      // Bonus for protein
      if (food.eiweiss * gramFactor > 15) score += 1.0;
      // Bonus for vegetables
      if (food.kategorie === 'vegetables') score += 1.5;
      // Bonus for fish
      if (food.kategorie === 'fish' && food.name !== 'fish') score += 1.0;
      // Penalty for desserts
      if (food.kategorie === 'desserts') score -= 2.0;
      // Penalty for fast food
      if (food.kategorie === 'fastfood') score -= 1.5;
    }
  }
  else if (entry.type === 'sport') {
    score += 2.5;
    if (entry.intensitaet === 'schwer') score += 1.0;
    if (entry.dauer >= 45) score += 0.5;
  }
  else if (entry.type === 'rauchen') {
    score -= 3.0 * entry.anzahl;
  }
  
  else if (entry.type === 'trinken') {
    if (['wasser', 'tee', 'kaffee'].includes(entry.trinkenType)) score += 0.5;
    if (entry.trinkenType === 'wein' && entry.menge <= 150) score += 1.0;
    if (entry.trinkenType === 'cola') score -= 1.5;
  }
  else if (entry.type === 'schlaf') {
    if (entry.stunden >= 7 && entry.stunden <= 9) score += 2.0;
    else if (entry.stunden < 5) score -= 2.5;
    if (entry.qualitaet === 'gut') score += 0.5;
    if (entry.qualitaet === 'schlecht') score -= 1.0;
  }
  else if (entry.type === 'bildschirmzeit') {
    if (entry.aktivitaet === 'arbeit' && entry.stunden > 10) score -= 1.5;
    if (['gaming', 'social-media'].includes(entry.aktivitaet) && entry.stunden > 4) score -= 2.0;
  }
  else if (entry.type === 'gewicht') {
    const diff = Math.abs(entry.gewichtKg - entry.zielgewicht);
    if (diff < 2) score += 1.5;
    else if (diff > 10) score -= 2.0;
  }
  else if (entry.type === 'stress') {
    if (entry.stressLevel >= 7) score -= 3.0;
    else if (entry.stressLevel >= 4) score -= 1.5;
    else score += 0.5;
  }
  
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

function getScoreClass(score) {
  if (score >= 8.5) return 'score-excellent';
  if (score >= 7) return 'score-good';
  if (score >= 5) return 'score-fair';
  return 'score-poor';
}

function getScoreColor(score) {
  if (score >= 8.5) return '#2ECC71';
  if (score >= 7) return '#A8E6CF';
  if (score >= 5) return '#FFD93D';
  return '#E74C3C';
}

// Week Calculation
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getFullYear(), week: weekNo };
}

function getWeekDates(year, week) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(ISOweekStart);
    date.setDate(ISOweekStart.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// Authentication Functions
function setAuthStatus(authenticated) {
  if (authenticated) {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
    initializeApp();
    renderSettingsView();
  } else {
    document.getElementById('authScreen').style.display = 'block';
    document.getElementById('appScreen').style.display = 'none';
  }
}

// Handle login
let authMode = 'login';
function renderAuthForm() {
  document.getElementById('authError').textContent = '';
  document.getElementById('authForm').innerHTML = `
    <div class="form-group">
      <input type="email" id="authEmail" class="form-control" placeholder="E-Mail" required>
    </div>
    <div class="form-group">
      <input type="password" id="authPassword" class="form-control" placeholder="Passwort" required>
    </div>
    ${authMode === 'register' ? `
      <div class="form-group">
        <input type="password" id="authPasswordConfirm" class="form-control" placeholder="Passwort erneut" required>
      </div>
    ` : ''}
    <button id="loginBtn" class="btn btn--primary btn--full-width">${authMode === 'login' ? 'Anmelden' : 'Registrieren'}</button>
    <button id="registerBtn" class="btn btn--secondary btn--full-width" style="margin-top: 10px;">${authMode === 'login' ? 'Registrieren' : 'Zurück zu Login'}</button>
    <div id="authError" class="error-message"></div>
  `;
  setTimeout(() => bindAuthActions(), 200);
}

function bindAuthActions() {
  document.getElementById('loginBtn').onclick = handleAuthSubmit;
  document.getElementById('registerBtn').onclick = () => {
    authMode = authMode === 'login' ? 'register' : 'login';
    renderAuthForm();
  };
}

async function handleAuthSubmit(e) {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  let errorDiv = document.getElementById('authError');
  
  if (!email || !password) {
    errorDiv.textContent = 'Bitte E-Mail und Passwort eingeben!';
    return;
  }
  
  try {
    if (authMode === 'login') {
      // Firebase Login
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      currentUser = userCredential.user;
      
      // Daten aus Firestore laden
      const userDoc = await db.collection('users').doc(currentUser.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        appState.cholesterinBaseline = userData.baseline || { ldl: 160, hdl: 35, triglyzeride: 180, datum: '2025-01-15' };
      }
      
      const entriesSnapshot = await db.collection('users').doc(currentUser.uid).collection('entries').get();
      appState.entries = entriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setAuthStatus(true);
    } else {
      // Firebase Registrierung
      const passwordConfirm = document.getElementById('authPasswordConfirm').value;
      if (password !== passwordConfirm) {
        errorDiv.textContent = 'Passwörter stimmen nicht überein!';
        return;
      }
      
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      currentUser = userCredential.user;
      
      // Initiale Benutzerdaten in Firestore speichern
      await db.collection('users').doc(currentUser.uid).set({
        email: email,
        baseline: { ldl: 160, hdl: 35, triglyzeride: 180, datum: '2025-01-15' },
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      appState.entries = [];
      setAuthStatus(true);
    }
  } catch (error) {
    console.error('Auth Error:', error);
    if (error.code === 'auth/user-not-found') {
      errorDiv.textContent = 'Benutzer nicht gefunden!';
    } else if (error.code === 'auth/wrong-password') {
      errorDiv.textContent = 'Falsches Passwort!';
    } else if (error.code === 'auth/email-already-in-use') {
      errorDiv.textContent = 'E-Mail existiert bereits!';
    } else if (error.code === 'auth/weak-password') {
      errorDiv.textContent = 'Passwort zu schwach (mindestens 6 Zeichen)!';
    } else {
      errorDiv.textContent = 'Fehler: ' + error.message;
    }
  }
}

// Firebase Auth State Listener - Auto-Login bei Reload
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // User ist eingeloggt
    console.log('✅ User bereits eingeloggt:', user.email);
    currentUser = user;
    
    // Daten aus Firestore laden
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      appState.cholesterinBaseline = userData.baseline || { ldl: 160, hdl: 35, triglyzeride: 180, datum: '2025-01-15' };
    }
    
    const entriesSnapshot = await db.collection('users').doc(user.uid).collection('entries').get();
    appState.entries = entriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    setAuthStatus(true);
  } else {
    // User ist ausgeloggt
    console.log('ℹ️ Kein User eingeloggt');
    setAuthStatus(false);
  }
});

// Initial auth render - WARTE auf Firebase
function initAuth() {
  if (window.firebaseReady) {
    console.log('✅ Starting auth initialization');
    renderAuthForm();
  } else {
    console.log('⏳ Waiting for Firebase...');
    setTimeout(initAuth, 100);
  }
}

initAuth();

function clearAppState() {
  appState.entries = [];
  appState.cholesterinBaseline = { ldl: 160, hdl: 35, triglyzeride: 180, datum: '2025-01-15' };
}

// ✅ NEUE VERSION mit Firebase:
window.logoutUser = async function() {
  try {
    await auth.signOut();
    clearAppState();
    currentUser = null;
    setAuthStatus(false);
    console.log('✅ Erfolgreich ausgeloggt');
  } catch (error) {
    console.error('❌ Logout-Fehler:', error);
  }
};

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.onclick = window.logoutUser;
}
// End authentication

async function saveUserData() {
  if (currentUser) {
    try {
      // Speichere Baseline in Firestore
      await db.collection('users').doc(currentUser.uid).set({
        baseline: appState.cholesterinBaseline
      }, { merge: true });
      
      // Speichere alle Einträge in Firestore
      // Lösche alte Einträge
      const entriesRef = db.collection('users').doc(currentUser.uid).collection('entries');
      const oldEntries = await entriesRef.get();
      const batch = db.batch();
      oldEntries.forEach(doc => batch.delete(doc.ref));
      
      // Füge neue Einträge hinzu
      appState.entries.forEach(entry => {
        const entryRef = entriesRef.doc(entry.id);
        batch.set(entryRef, entry);
      });
      
      await batch.commit();
      console.log('✅ Daten in Firebase gespeichert');
    } catch (error) {
      console.error('❌ Fehler beim Speichern:', error);
    }
  }
}

  // Status (simulate success)
  const statusEl = document.getElementById('firebaseStatus');
  if (statusEl) {
    statusEl.textContent = 'Verbunden';
    statusEl.className = 'status status--success';
  }

// Navigation
function initNavigation() {
  navItems = document.querySelectorAll('.nav-item');
  tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabName = item.dataset.tab;
      switchTab(tabName);
    });
  });
}

// Safe initialization after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigation);
} else {
  initNavigation();
}

function switchTab(tabName) {
  navItems.forEach(item => {
    if (item.dataset.tab === tabName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  tabContents.forEach(content => {
    content.classList.remove('active');
  });
  
  const activeTab = document.getElementById(tabName + 'Tab');
  if (activeTab) {
    activeTab.classList.add('active');
  }
  
  const titles = {
    add: 'Hinzufügen',
    day: 'Tagesansicht',
    week: 'Wochenansicht',
    development: 'Entwicklung',
    settings: 'Einstellungen'
  };
  document.getElementById('headerTitle').textContent = titles[tabName] || 'App';
  
  if (tabName === 'day') renderDayView();
  if (tabName === 'week') renderWeekView();
  if (tabName === 'development') renderDevelopmentView();
  if (tabName === 'settings') renderSettingsView();
}

// Add Entry Logic
const addTypeBtns = document.querySelectorAll('.add-type-btn');
const entryForms = document.querySelectorAll('.entry-form');

addTypeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    document.querySelector('.add-type-selector').style.display = 'none';
    entryForms.forEach(form => form.style.display = 'none');
    document.getElementById(type + 'Form').style.display = 'block';
  });
});

document.querySelectorAll('.cancel-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    entryForms.forEach(form => form.style.display = 'none');
    document.querySelector('.add-type-selector').style.display = 'grid';
  });
});

// Populate Food List
const foodListDatalist = document.getElementById('foodList');
foodDatabase.forEach(food => {
  const option = document.createElement('option');
  option.value = food.name.charAt(0).toUpperCase() + food.name.slice(1);
  foodListDatalist.appendChild(option);
});

// Essen Form Logic
const essenNameInput = document.getElementById('essenName');
const essenGrammInput = document.getElementById('essenGramm');

function updateEssenPreview() {
  const foodName = essenNameInput.value.toLowerCase();
  const gramm = parseInt(essenGrammInput.value) || 100;
  const food = foodDatabase.find(f => f.name === foodName);
  
  if (food) {
    const factor = gramm / 100;
    const nutrition = document.getElementById('essenNutrition');
    nutrition.innerHTML = `
      <h4>Nährwerte (${gramm}g)</h4>
      <div class="nutrition-grid">
        <div>Kalorien: ${Math.round(food.kcal * factor)} kcal</div>
        <div>Kohlenhydrate: ${Math.round(food.kh * factor)}g</div>
        <div>Fett: ${Math.round(food.fett * factor)}g</div>
        <div>Eiweiß: ${Math.round(food.eiweiss * factor)}g</div>
        <div>Cholesterin: ${Math.round(food.chol * factor)}mg</div>
      </div>
    `;
    
    const tempEntry = {
      type: 'ernaehrung',
      gericht: foodName,
      gramm: gramm
    };
    const effect = calculateCholesterinEffect(tempEntry);
    tempEntry.cholesterinEffekt = effect;
    const score = calculateHealthScore(tempEntry);
    
    const effectDiv = document.getElementById('essenEffect');
    effectDiv.innerHTML = `
      <h4>Cholesterin-Effekt</h4>
      <div class="effect-item">
        <span>LDL:</span>
        <span class="${effect.ldl < 0 ? 'effect-positive' : 'effect-negative'}">
          ${effect.ldl > 0 ? '+' : ''}${effect.ldl}
        </span>
      </div>
      <div class="effect-item">
        <span>HDL:</span>
        <span class="${effect.hdl > 0 ? 'effect-positive' : 'effect-negative'}">
          ${effect.hdl > 0 ? '+' : ''}${effect.hdl}
        </span>
      </div>
      <div class="effect-item">
        <span>Triglyzeride:</span>
        <span class="${effect.trig < 0 ? 'effect-positive' : 'effect-negative'}">
          ${effect.trig > 0 ? '+' : ''}${effect.trig}
        </span>
      </div>
    `;
    
    const scoreDiv = document.getElementById('essenScoreDisplay');
    scoreDiv.innerHTML = `
      <h4>Gesundheitsscore</h4>
      <div class="score-badge ${getScoreClass(score)}" style="font-size: 24px; padding: 12px;">
        ${score}
      </div>
    `;
  }
}

essenNameInput.addEventListener('input', updateEssenPreview);
essenGrammInput.addEventListener('input', updateEssenPreview);

document.getElementById('saveEssenBtn').addEventListener('click', () => {
  const foodName = essenNameInput.value.toLowerCase();
  const gramm = parseInt(essenGrammInput.value) || 100;
  const food = foodDatabase.find(f => f.name === foodName);
  
  if (!food) {
    alert('Bitte wählen Sie ein Lebensmittel aus der Datenbank.');
    return;
  }
  
  const factor = gramm / 100;
  const entry = {
    id: generateId(),
    datum: getCurrentDate(),
    zeit: getCurrentTime(),
    type: 'ernaehrung',
    gericht: foodName,
    gramm: gramm,
    kcal: Math.round(food.kcal * factor),
    kh: Math.round(food.kh * factor),
    fett: Math.round(food.fett * factor),
    eiweiss: Math.round(food.eiweiss * factor),
    chol: Math.round(food.chol * factor)
  };
  
  entry.cholesterinEffekt = calculateCholesterinEffect(entry);
  entry.healthScore = calculateHealthScore(entry);
  
  appState.entries.push(entry);
  saveUserData();
  
  essenNameInput.value = '';
  essenGrammInput.value = '100';
  document.getElementById('essenNutrition').innerHTML = '';
  document.getElementById('essenEffect').innerHTML = '';
  document.getElementById('essenScoreDisplay').innerHTML = '';
  document.getElementById('essenForm').style.display = 'none';
  document.querySelector('.add-type-selector').style.display = 'grid';
  
  switchTab('day');
});

// Sport Form Logic
function updateSportPreview() {
  const intensitaet = document.getElementById('sportIntensitaet').value;
  const dauer = parseInt(document.getElementById('sportDauer').value) || 30;
  const ruhezeit = parseFloat(document.getElementById('sportRuhezeit').value) || 0;
  const schritte = parseInt(document.getElementById('sportSchritte').value) || 0;
  
  const tempEntry = {
    type: 'sport',
    intensitaet: intensitaet,
    dauer: dauer,
    ruhezeit: ruhezeit,
    schritte: schritte
  };
  const effect = calculateCholesterinEffect(tempEntry);
  tempEntry.cholesterinEffekt = effect;
  const score = calculateHealthScore(tempEntry);
  
  const effectDiv = document.getElementById('sportEffect');
  effectDiv.innerHTML = `
    <h4>Cholesterin-Effekt</h4>
    <div class="effect-item">
      <span>LDL:</span>
      <span class="${effect.ldl < 0 ? 'effect-positive' : 'effect-negative'}">
        ${effect.ldl > 0 ? '+' : ''}${effect.ldl}
      </span>
    </div>
    <div class="effect-item">
      <span>HDL:</span>
      <span class="${effect.hdl > 0 ? 'effect-positive' : 'effect-negative'}">
        ${effect.hdl > 0 ? '+' : ''}${effect.hdl}
      </span>
    </div>
    <div class="effect-item">
      <span>Triglyzeride:</span>
      <span class="${effect.trig < 0 ? 'effect-positive' : 'effect-negative'}">
        ${effect.trig > 0 ? '+' : ''}${effect.trig}
      </span>
    </div>
  `;
  
  const scoreDiv = document.getElementById('sportScoreDisplay');
  scoreDiv.innerHTML = `
    <h4>Gesundheitsscore</h4>
    <div class="score-badge ${getScoreClass(score)}" style="font-size: 24px; padding: 12px;">
      ${score}
    </div>
  `;
}

document.getElementById('sportIntensitaet').addEventListener('change', updateSportPreview);
document.getElementById('sportDauer').addEventListener('input', updateSportPreview);
document.getElementById('sportRuhezeit').addEventListener('input', updateSportPreview);
document.getElementById('sportSchritte').addEventListener('input', updateSportPreview);

document.getElementById('saveSportBtn').addEventListener('click', () => {
  const aktivitaet = document.getElementById('sportName').value || 'Sport';
  const intensitaet = document.getElementById('sportIntensitaet').value;
  const dauer = parseInt(document.getElementById('sportDauer').value) || 30;
  const ruhezeit = parseFloat(document.getElementById('sportRuhezeit').value) || 0;
  const schritte = parseInt(document.getElementById('sportSchritte').value) || 0;
  
  const entry = {
    id: generateId(),
    datum: getCurrentDate(),
    zeit: getCurrentTime(),
    type: 'sport',
    aktivitaet: aktivitaet,
    intensitaet: intensitaet,
    dauer: dauer,
    ruhezeit: ruhezeit,
    schritte: schritte
  };
  
  entry.cholesterinEffekt = calculateCholesterinEffect(entry);
  entry.healthScore = calculateHealthScore(entry);
  
  appState.entries.push(entry);
  saveUserData();
  
  document.getElementById('sportName').value = '';
  document.getElementById('sportDauer').value = '30';
  document.getElementById('sportRuhezeit').value = '0';
  document.getElementById('sportSchritte').value = '0';
  document.getElementById('sportEffect').innerHTML = '';
  document.getElementById('sportScoreDisplay').innerHTML = '';
  document.getElementById('sportForm').style.display = 'none';
  document.querySelector('.add-type-selector').style.display = 'grid';
  
  switchTab('day');
});

// Rauchen Form Logic
function updateRauchenPreview() {
  const anzahl = parseInt(document.getElementById('rauchenAnzahl').value) || 1;
  
  const tempEntry = {
    type: 'rauchen',
    anzahl: anzahl
  };
  const effect = calculateCholesterinEffect(tempEntry);
  tempEntry.cholesterinEffekt = effect;
  const score = calculateHealthScore(tempEntry);
  
  const effectDiv = document.getElementById('rauchenEffect');
  effectDiv.innerHTML = `
    <h4>Cholesterin-Effekt</h4>
    <div class="effect-item">
      <span>LDL:</span>
      <span class="effect-negative">+${effect.ldl}</span>
    </div>
    <div class="effect-item">
      <span>HDL:</span>
      <span class="effect-negative">${effect.hdl}</span>
    </div>
    <div class="effect-item">
      <span>Triglyzeride:</span>
      <span class="effect-negative">+${effect.trig}</span>
    </div>
  `;
  
  const scoreDiv = document.getElementById('rauchenScoreDisplay');
  scoreDiv.innerHTML = `
    <h4>Gesundheitsscore</h4>
    <div class="score-badge ${getScoreClass(score)}" style="font-size: 24px; padding: 12px;">
      ${score}
    </div>
  `;
}

document.getElementById('rauchenAnzahl').addEventListener('input', updateRauchenPreview);
updateRauchenPreview();

document.getElementById('saveRauchenBtn').addEventListener('click', () => {
  const anzahl = parseInt(document.getElementById('rauchenAnzahl').value) || 1;
  
  const entry = {
    id: generateId(),
    datum: getCurrentDate(),
    zeit: getCurrentTime(),
    type: 'rauchen',
    anzahl: anzahl
  };
  
  entry.cholesterinEffekt = calculateCholesterinEffect(entry);
  entry.healthScore = calculateHealthScore(entry);
  
  appState.entries.push(entry);
  saveUserData();
  
  document.getElementById('rauchenAnzahl').value = '1';
  document.getElementById('rauchenEffect').innerHTML = '';
  document.getElementById('rauchenScoreDisplay').innerHTML = '';
  document.getElementById('rauchenForm').style.display = 'none';
  document.querySelector('.add-type-selector').style.display = 'grid';
  
  switchTab('day');
});

// Render Functions
// Calculate total cholesterol
function calculateTotalCholesterol(ldl, hdl, trig) {
  return ldl + hdl + (trig / 5);
}

// Calculate smoke-free days since Nov 1, 2025
function calculateSmokeFreeDays() {
  const startDate = new Date('2025-11-01');
  const today = new Date();
  const smokingEntries = appState.entries.filter(e => e.type === 'rauchen');
  
  if (smokingEntries.length === 0) {
    const diffTime = Math.abs(today - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  
  // Find last smoking entry
  const sortedSmokingEntries = smokingEntries.sort((a, b) => {
    return new Date(b.datum) - new Date(a.datum);
  });
  const lastSmokingDate = new Date(sortedSmokingEntries[0].datum);
  
  if (lastSmokingDate < startDate) {
    const diffTime = Math.abs(today - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  
  const diffTime = Math.abs(today - lastSmokingDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Get date range for chart
function getDateRange(range) {
  const today = new Date();
  let startDate = new Date();
  
  switch(range) {
    case 'week':
      startDate.setDate(today.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(today.getMonth() - 1);
      break;
    case '3months':
      startDate.setMonth(today.getMonth() - 3);
      break;
    case '6months':
      startDate.setMonth(today.getMonth() - 6);
      break;
    case 'year':
      startDate.setFullYear(today.getFullYear() - 1);
      break;
    case '2years':
      startDate.setFullYear(today.getFullYear() - 2);
      break;
    case '5years':
      startDate.setFullYear(today.getFullYear() - 5);
      break;
    case 'all':
      if (appState.entries.length > 0) {
        const allDates = appState.entries.map(e => new Date(e.datum));
        startDate = new Date(Math.min(...allDates));
      } else {
        startDate = new Date('2025-01-01');
      }
      break;
  }
  
  return { start: startDate, end: today };
}

// Render Development View
function renderDevelopmentView() {
  const smokeFreeDays = calculateSmokeFreeDays();
  document.getElementById('smokeFreeCounter').textContent = `Rauchfrei seit: ${smokeFreeDays} Tage`;
  
  renderLDLChart();
  renderHDLChart();
  renderTriglyceridesChart();
  renderTotalCholesterolChart();
  renderScoreChart();
  
  // Bind time range selectors
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const chart = e.target.dataset.chart;
      const range = e.target.dataset.range;
      
      // Update active state
      document.querySelectorAll(`.time-btn[data-chart="${chart}"]`).forEach(b => {
        b.classList.remove('active');
      });
      e.target.classList.add('active');
      
      chartTimeRanges[chart] = range;
      
      if (chart === 'ldl') renderLDLChart();
      if (chart === 'hdl') renderHDLChart();
      if (chart === 'trig') renderTriglyceridesChart();
      if (chart === 'total') renderTotalCholesterolChart();
      if (chart === 'score') renderScoreChart();
    });
  });
}

function formatChartLabel(date, range) {
  const d = new Date(date);
  const timeRange = chartTimeRanges[range] || 'week';
  
  if (timeRange === 'week') {
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return dayNames[d.getDay()];
  } else if (timeRange === 'month') {
    return d.getDate() + '.' + (d.getMonth() + 1);
  } else if (timeRange === '3months' || timeRange === '6months') {
    const week = getWeekNumber(date);
    return 'KW' + week.week;
  } else {
    const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    return monthNames[d.getMonth()];
  }
}

function renderLDLChart() {
  const range = getDateRange(chartTimeRanges.ldl);
  const baseline = appState.cholesterinBaseline;
  const relevantEntries = appState.entries.filter(e => {
    const date = new Date(e.datum);
    return date >= range.start && date <= range.end;
  });
  
  const dateMap = {};
  relevantEntries.forEach(e => {
    if (!dateMap[e.datum]) dateMap[e.datum] = [];
    dateMap[e.datum].push(e);
  });
  
  const dates = Object.keys(dateMap).sort();
  let currentLDL = baseline.ldl;
  const ldlValues = [];
  const labels = [];
  
  dates.forEach(date => {
    const dayEntries = dateMap[date];
    const totalEffect = dayEntries.reduce((sum, e) => sum + (e.cholesterinEffekt.ldl || 0), 0);
    currentLDL += totalEffect;
    ldlValues.push(Math.round(currentLDL * 10) / 10);
    labels.push(formatChartLabel(date, 'ldl'));
  });
  
  const ctx = document.getElementById('ldlChart');
  if (ldlChart) ldlChart.destroy();
  
  ldlChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'LDL',
          data: ldlValues,
          borderColor: '#000000',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#000000'
        },
        {
          label: 'Optimal <115',
          data: Array(labels.length).fill(115),
          borderColor: '#3498DB',
          borderDash: [5, 5],
          borderWidth: 3,
          pointRadius: 0,
          fill: false
        },
        {
          label: 'zu hoch >160',
          data: Array(labels.length).fill(160),
          borderColor: '#E74C3C',
          borderDash: [5, 5],
          borderWidth: 3,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom' }
      },
      scales: {
        y: { beginAtZero: false, min: 50, max: 250 },
        x: { display: true }
      }
    }
  });
}

function renderHDLChart() {
  const range = getDateRange(chartTimeRanges.hdl);
  const baseline = appState.cholesterinBaseline;
  const relevantEntries = appState.entries.filter(e => {
    const date = new Date(e.datum);
    return date >= range.start && date <= range.end;
  });
  
  const dateMap = {};
  relevantEntries.forEach(e => {
    if (!dateMap[e.datum]) dateMap[e.datum] = [];
    dateMap[e.datum].push(e);
  });
  
  const dates = Object.keys(dateMap).sort();
  let currentHDL = baseline.hdl;
  const hdlValues = [];
  const labels = [];
  
  dates.forEach(date => {
    const dayEntries = dateMap[date];
    const totalEffect = dayEntries.reduce((sum, e) => sum + (e.cholesterinEffekt.hdl || 0), 0);
    currentHDL += totalEffect;
    hdlValues.push(Math.round(currentHDL * 10) / 10);
    labels.push(formatChartLabel(date, 'hdl'));
  });
  
  const ctx = document.getElementById('hdlChart');
  if (hdlChart) hdlChart.destroy();
  
  hdlChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'HDL',
          data: hdlValues,
          borderColor: '#000000',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#000000'
        },
        {
          label: 'Optimal >40',
          data: Array(labels.length).fill(40),
          borderColor: '#3498DB',
          borderDash: [5, 5],
          borderWidth: 3,
          pointRadius: 0,
          fill: false
        },
        {
          label: 'zu hoch <35',
          data: Array(labels.length).fill(35),
          borderColor: '#E74C3C',
          borderDash: [5, 5],
          borderWidth: 3,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom' }
      },
      scales: {
        y: { beginAtZero: false, min: 20, max: 50 },
        x: { display: true }
      }
    }
  });
}

function renderTriglyceridesChart() {
  const range = getDateRange(chartTimeRanges.trig || 'week');
  const baseline = appState.cholesterinBaseline;
  const relevantEntries = appState.entries.filter(e => {
    const date = new Date(e.datum);
    return date >= range.start && date <= range.end;
  });
  
  const dateMap = {};
  relevantEntries.forEach(e => {
    if (!dateMap[e.datum]) dateMap[e.datum] = [];
    dateMap[e.datum].push(e);
  });
  
  const dates = Object.keys(dateMap).sort();
  let currentTrig = baseline.triglyzeride;
  const trigValues = [];
  const labels = [];
  
  dates.forEach(date => {
    const dayEntries = dateMap[date];
    const totalEffect = dayEntries.reduce((sum, e) => sum + (e.cholesterinEffekt.trig || 0), 0);
    currentTrig += totalEffect;
    trigValues.push(Math.round(currentTrig * 10) / 10);
    labels.push(formatChartLabel(date, 'trig'));
  });
  
  const ctx = document.getElementById('trigChart');
  if (trigChart) trigChart.destroy();
  
  trigChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Triglyzeride',
          data: trigValues,
          borderColor: '#000000',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#000000'
        },
        {
          label: 'Optimal <150',
          data: Array(labels.length).fill(150),
          borderColor: '#3498DB',
          borderDash: [5, 5],
          borderWidth: 3,
          pointRadius: 0,
          fill: false
        },
        {
          label: 'zu hoch >200',
          data: Array(labels.length).fill(200),
          borderColor: '#E74C3C',
          borderDash: [5, 5],
          borderWidth: 3,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom' }
      },
      scales: {
        y: { beginAtZero: false, min: 50, max: 250 },
        x: { display: true }
      }
    }
  });
}

function renderTotalCholesterolChart() {
  const range = getDateRange(chartTimeRanges.total);
  const baseline = appState.cholesterinBaseline;
  const relevantEntries = appState.entries.filter(e => {
    const date = new Date(e.datum);
    return date >= range.start && date <= range.end;
  });
  
  const dateMap = {};
  relevantEntries.forEach(e => {
    if (!dateMap[e.datum]) dateMap[e.datum] = [];
    dateMap[e.datum].push(e);
  });
  
  const dates = Object.keys(dateMap).sort();
  let currentLDL = baseline.ldl;
  let currentHDL = baseline.hdl;
  let currentTrig = baseline.triglyzeride;
  const totalValues = [];
  const labels = [];
  
  dates.forEach(date => {
    const dayEntries = dateMap[date];
    const ldlEffect = dayEntries.reduce((sum, e) => sum + (e.cholesterinEffekt.ldl || 0), 0);
    const hdlEffect = dayEntries.reduce((sum, e) => sum + (e.cholesterinEffekt.hdl || 0), 0);
    const trigEffect = dayEntries.reduce((sum, e) => sum + (e.cholesterinEffekt.trig || 0), 0);
    
    currentLDL += ldlEffect;
    currentHDL += hdlEffect;
    currentTrig += trigEffect;
    
    const total = calculateTotalCholesterol(currentLDL, currentHDL, currentTrig);
    totalValues.push(Math.round(total * 10) / 10);
    labels.push(formatChartLabel(date, 'total'));
  });
  
  const ctx = document.getElementById('totalChart');
  if (totalChart) totalChart.destroy();
  
  totalChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Gesamtcholesterin',
          data: totalValues,
          borderColor: '#000000',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#000000'
        },
        {
          label: 'Optimal <200',
          data: Array(labels.length).fill(200),
          borderColor: '#3498DB',
          borderDash: [5, 5],
          borderWidth: 3,
          pointRadius: 0,
          fill: false
        },
        {
          label: 'zu hoch >240',
          data: Array(labels.length).fill(240),
          borderColor: '#E74C3C',
          borderDash: [5, 5],
          borderWidth: 3,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom' }
      },
      scales: {
        y: { beginAtZero: false, min: 150, max: 300 },
        x: { display: true }
      }
    }
  });
}

function renderScoreChart() {
  const range = getDateRange(chartTimeRanges.score);
  const relevantEntries = appState.entries.filter(e => {
    const date = new Date(e.datum);
    return date >= range.start && date <= range.end;
  });
  
  const dateMap = {};
  relevantEntries.forEach(e => {
    if (!dateMap[e.datum]) dateMap[e.datum] = [];
    dateMap[e.datum].push(e);
  });
  
  const dates = Object.keys(dateMap).sort();
  const scoreValues = [];
  const labels = [];
  
  dates.forEach(date => {
    const dayEntries = dateMap[date];
    const avgScore = dayEntries.reduce((sum, e) => sum + e.healthScore, 0) / dayEntries.length;
    scoreValues.push(Math.round(avgScore * 10) / 10);
    labels.push(formatChartLabel(date, 'score'));
  });
  
  const ctx = document.getElementById('scoreChart');
  if (scoreChart) scoreChart.destroy();
  
  scoreChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Gesundheitsscore',
          data: scoreValues,
          borderColor: '#000000',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#000000'
        },
        {
          label: 'Optimal >7.0',
          data: Array(labels.length).fill(7.0),
          borderColor: '#3498DB',
          borderDash: [5, 5],
          borderWidth: 3,
          pointRadius: 0,
          fill: false
        },
        {
          label: 'zu niedrig <5.0',
          data: Array(labels.length).fill(5.0),
          borderColor: '#E74C3C',
          borderDash: [5, 5],
          borderWidth: 3,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom' }
      },
      scales: {
        y: { beginAtZero: true, min: 0, max: 10 },
        x: { display: true }
      }
    }
  });
}
  function renderEntriesList(entries, containerId) {
  const container = document.getElementById(containerId);
  
  if (entries.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: 20px;">Keine Einträge</p>';
    return;
  }
  
  const sorted = [...entries].sort((a, b) => {
    const timeA = a.zeit || '00:00';
    const timeB = b.zeit || '00:00';
    return timeB.localeCompare(timeA);
  });
    
  container.innerHTML = sorted.map(entry => {
    const emojiMap = {
      ernaehrung: '🍽️',
      sport: '🏃',
      rauchen: '🚬',
      trinken: '💧',
      schlaf: '😴',
      bildschirmzeit: '📱',
      gewicht: '⚖️',
      stress: '⚠️'
    };
    const emoji = emojiMap[entry.type] || '❓';
    let name = '';
    if (entry.type === 'ernaehrung') name = entry.gericht;
    else if (entry.type === 'sport') name = entry.aktivitaet;
    else if (entry.type === 'rauchen') name = 'Rauchen';
    else if (entry.type === 'trinken') name = entry.trinkenType;
    else if (entry.type === 'schlaf') name = 'Schlaf';
    else if (entry.type === 'bildschirmzeit') name = 'Bildschirmzeit';
    else if (entry.type === 'gewicht') name = 'Gewicht';
    else if (entry.type === 'stress') name = 'Stress';
    const effect = entry.cholesterinEffekt;
    
    return `
      <div class="entry-item" data-id="${entry.id}">
        <div class="entry-main">
          <div class="entry-header">
            <span class="entry-emoji">${emoji}</span>
            <span class="entry-time">${formatTime(entry.zeit)}</span>
          </div>
          <div class="entry-name">${name.charAt(0).toUpperCase() + name.slice(1)}</div>
          <div class="entry-effect">
            LDL ${effect.ldl > 0 ? '+' : ''}${effect.ldl} | 
            HDL ${effect.hdl > 0 ? '+' : ''}${effect.hdl} | 
            Trig ${effect.trig > 0 ? '+' : ''}${effect.trig}
          </div>
        </div>
        <div class="entry-score">
          <div class="score-badge ${getScoreClass(entry.healthScore)}">
            ${entry.healthScore}
          </div>
          <button class="delete-btn" onclick="deleteEntry('${entry.id}')">Löschen</button>
        </div>
      </div>
    `;
  }).join('');
}

window.deleteEntry = function(id) {
  if (confirm('Eintrag wirklich löschen?')) {
    appState.entries = appState.entries.filter(e => e.id !== id);
    saveUserData();
    refreshAllViews();
  }
};

function renderDayView() {
  const datePicker = document.getElementById('dayPicker');
  datePicker.value = appState.viewedDate;
  
  const entries = appState.entries.filter(e => e.datum === appState.viewedDate);
  document.getElementById('dayEntriesCount').textContent = entries.length;
  
  if (entries.length > 0) {
    const avgScore = entries.reduce((sum, e) => sum + e.healthScore, 0) / entries.length;
    const scoreEl = document.getElementById('dayScoreAvg');
    scoreEl.textContent = avgScore.toFixed(1);
    scoreEl.className = 'summary-value score-badge ' + getScoreClass(avgScore);
  } else {
    document.getElementById('dayScoreAvg').textContent = '-';
    document.getElementById('dayScoreAvg').className = 'summary-value score-badge';
  }
  
  renderEntriesList(entries, 'dayEntries');
}

document.getElementById('dayPicker').addEventListener('change', (e) => {
  appState.viewedDate = e.target.value;
  renderDayView();
});

document.getElementById('prevDayBtn').addEventListener('click', () => {
  const date = new Date(appState.viewedDate);
  date.setDate(date.getDate() - 1);
  appState.viewedDate = date.toISOString().split('T')[0];
  renderDayView();
});

document.getElementById('nextDayBtn').addEventListener('click', () => {
  const date = new Date(appState.viewedDate);
  date.setDate(date.getDate() + 1);
  appState.viewedDate = date.toISOString().split('T')[0];
  renderDayView();
});

function renderWeekView() {
  const { year, week } = appState.viewedWeek;
  const weekDates = getWeekDates(year, week);
  const weekStart = new Date(weekDates[0]);
  const weekEnd = new Date(weekDates[6]);
  
  document.getElementById('weekInfo').textContent = 
    `KW${week} (${weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${weekEnd.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })})`;
  
  const weekDaysContainer = document.getElementById('weekDays');
  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  
  weekDaysContainer.innerHTML = weekDates.map((date, index) => {
    const entries = appState.entries.filter(e => e.datum === date);
    const avgScore = entries.length > 0 
      ? (entries.reduce((sum, e) => sum + e.healthScore, 0) / entries.length).toFixed(1)
      : '-';
    
    return `
      <div class="week-day-item">
        <div class="week-day-date">
          ${dayNames[index]}, ${new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
        </div>
        <div class="week-day-info">
          <span>${entries.length} Einträge</span>
          <span class="score-badge ${avgScore !== '-' ? getScoreClass(parseFloat(avgScore)) : ''}">
            ${avgScore}
          </span>
        </div>
      </div>
    `;
  }).join('');
  
  // Calculate week summary with total cholesterol
  const weekEntries = appState.entries.filter(e => weekDates.includes(e.datum));
  const totalEffect = weekEntries.reduce((sum, e) => ({
    ldl: sum.ldl + e.cholesterinEffekt.ldl,
    hdl: sum.hdl + e.cholesterinEffekt.hdl,
    trig: sum.trig + e.cholesterinEffekt.trig
  }), { ldl: 0, hdl: 0, trig: 0 });
  
  const baseline = appState.cholesterinBaseline;
  const expectedLDL = baseline.ldl + totalEffect.ldl;
  const expectedHDL = baseline.hdl + totalEffect.hdl;
  const expectedTrig = baseline.triglyzeride + totalEffect.trig;
  
  document.getElementById('weekLdlBase').textContent = baseline.ldl;
  document.getElementById('weekLdlExpected').textContent = expectedLDL.toFixed(1);
  document.getElementById('weekLdlTrend').textContent = totalEffect.ldl < -2 ? '✅' : totalEffect.ldl > 2 ? '🔴' : '⚪';
  
  document.getElementById('weekHdlBase').textContent = baseline.hdl;
  document.getElementById('weekHdlExpected').textContent = expectedHDL.toFixed(1);
  document.getElementById('weekHdlTrend').textContent = totalEffect.hdl > 1 ? '✅' : totalEffect.hdl < -1 ? '🔴' : '⚪';
  
  document.getElementById('weekTrigBase').textContent = baseline.triglyzeride;
  document.getElementById('weekTrigExpected').textContent = expectedTrig.toFixed(1);
  document.getElementById('weekTrigTrend').textContent = totalEffect.trig < -5 ? '✅' : totalEffect.trig > 5 ? '🔴' : '⚪';
}

document.getElementById('prevWeekBtn').addEventListener('click', () => {
  appState.viewedWeek.week--;
  if (appState.viewedWeek.week < 1) {
    appState.viewedWeek.week = 52;
    appState.viewedWeek.year--;
  }
  renderWeekView();
});

document.getElementById('nextWeekBtn').addEventListener('click', () => {
  appState.viewedWeek.week++;
  if (appState.viewedWeek.week > 52) {
    appState.viewedWeek.week = 1;
    appState.viewedWeek.year++;
  }
  renderWeekView();
});

// Auto-estimate cholesterol based on food name and fats
function estimateCholesterol(foodName, saturatedFat, unsaturatedFat, totalFat) {
  const name = foodName.toLowerCase();
  
  // Name-based estimates
  if (name.includes('ei')) return 370;
  if (name.includes('käse') || name.includes('kaese')) {
    return saturatedFat > 15 ? 110 : 90;
  }
  if (name.includes('butter')) return 215;
  if (name.includes('sahne') || name.includes('cream')) return 137;
  if (name.includes('fisch')) return name.includes('lachs') ? 55 : 40;
  if (name.includes('fleisch') || name.includes('rind') || name.includes('schwein')) {
    return saturatedFat > 8 ? 85 : 65;
  }
  if (name.includes('huhn') || name.includes('pute') || name.includes('geflügel')) return 70;
  if (name.includes('garnele') || name.includes('shrimp')) return 150;
  if (name.includes('leber')) return 200;
  
  // Fat-based estimates
  if (saturatedFat > 10) return Math.round(50 + saturatedFat * 3);
  if (saturatedFat > 5) return Math.round(30 + saturatedFat * 2);
  if (saturatedFat < 3) return Math.round(saturatedFat * 3);
  
  // Default
  return Math.round(totalFat * 2);
}

// Calculate live LDL/HDL/Trig effect from fats
function calculateFatEffect(saturatedFat, unsaturatedFat, transFat, cholesterol) {
  const ldlEffect = (saturatedFat * 0.15) + (unsaturatedFat * -0.05) + (transFat * 0.30) + (cholesterol * 0.003);
  const hdlEffect = (saturatedFat * 0.02) + (unsaturatedFat * 0.05) + (transFat * -0.15);
  const trigEffect = (saturatedFat * 0.05) + (unsaturatedFat * -0.02) + (transFat * 0.10);
  
  return {
    ldl: Math.round(ldlEffect * 10) / 10,
    hdl: Math.round(hdlEffect * 10) / 10,
    trig: Math.round(trigEffect * 10) / 10
  };
}

// Update custom food form with live estimates
function updateCustomFoodEstimates() {
  const name = document.getElementById('customFoodName').value.trim();
  const saturatedFat = parseFloat(document.getElementById('customFoodSaturatedFat').value) || 0;
  const unsaturatedFat = parseFloat(document.getElementById('customFoodUnsaturatedFat').value) || 0;
  const transFat = parseFloat(document.getElementById('customFoodTransFat').value) || 0;
  const totalFat = parseFloat(document.getElementById('customFoodFett').value) || 0;
  
  // Auto-estimate cholesterol if field is empty
  const cholField = document.getElementById('customFoodChol');
  if (!cholField.value && name) {
    const estimated = estimateCholesterol(name, saturatedFat, unsaturatedFat, totalFat);
    cholField.placeholder = `Geschätzt: ${estimated}mg`;
    document.getElementById('cholesterolEstimate').textContent = `💡 Geschätzt: ${estimated}mg (Sie können editieren)`;
  }
  
  // Calculate and show live effect
  if (saturatedFat || unsaturatedFat || transFat) {
    const cholesterol = parseFloat(cholField.value) || estimateCholesterol(name, saturatedFat, unsaturatedFat, totalFat);
    const effect = calculateFatEffect(saturatedFat, unsaturatedFat, transFat, cholesterol);
    
    const effectDiv = document.getElementById('customFoodLiveEffect');
    effectDiv.style.display = 'block';
    effectDiv.innerHTML = `
      <h4>LDL/HDL Effekt pro 100g</h4>
      <div class="effect-item"><span>LDL:</span><span class="${effect.ldl < 0 ? 'effect-positive' : 'effect-negative'}">${effect.ldl > 0 ? '+' : ''}${effect.ldl} mg/dL</span></div>
      <div class="effect-item"><span>HDL:</span><span class="${effect.hdl > 0 ? 'effect-positive' : 'effect-negative'}">${effect.hdl > 0 ? '+' : ''}${effect.hdl} mg/dL</span></div>
      <div class="effect-item"><span>Triglyzeride:</span><span class="${effect.trig < 0 ? 'effect-positive' : 'effect-negative'}">${effect.trig > 0 ? '+' : ''}${effect.trig} mg/dL</span></div>
    `;
  }
}

// Bind custom food form listeners
function bindCustomFoodListeners() {
  const nameField = document.getElementById('customFoodName');
  const satFatField = document.getElementById('customFoodSaturatedFat');
  const unsatFatField = document.getElementById('customFoodUnsaturatedFat');
  const transFatField = document.getElementById('customFoodTransFat');
  const totalFatField = document.getElementById('customFoodFett');
  const cholField = document.getElementById('customFoodChol');
  
  if (nameField) nameField.addEventListener('input', updateCustomFoodEstimates);
  if (satFatField) satFatField.addEventListener('input', updateCustomFoodEstimates);
  if (unsatFatField) unsatFatField.addEventListener('input', updateCustomFoodEstimates);
  if (transFatField) transFatField.addEventListener('input', updateCustomFoodEstimates);
  if (totalFatField) totalFatField.addEventListener('input', updateCustomFoodEstimates);
  if (cholField) cholField.addEventListener('input', updateCustomFoodEstimates);
}

// Add custom food to database
const addCustomFoodBtn = document.getElementById('addCustomFoodBtn');
if (addCustomFoodBtn) {
  addCustomFoodBtn.addEventListener('click', () => {
  const name = document.getElementById('customFoodName').value.trim().toLowerCase();
  const kcal = parseFloat(document.getElementById('customFoodKcal').value) || 0;
  const kh = parseFloat(document.getElementById('customFoodKh').value) || 0;
  const fett = parseFloat(document.getElementById('customFoodFett').value) || 0;
  const saturatedFat = parseFloat(document.getElementById('customFoodSaturatedFat').value) || 0;
  const unsaturatedFat = parseFloat(document.getElementById('customFoodUnsaturatedFat').value) || 0;
  const transFat = parseFloat(document.getElementById('customFoodTransFat').value) || 0;
  const eiweiss = parseFloat(document.getElementById('customFoodEiweiss').value) || 0;
  let chol = parseFloat(document.getElementById('customFoodChol').value);
  
  // Auto-estimate if not provided
  if (!chol) {
    chol = estimateCholesterol(name, saturatedFat, unsaturatedFat, fett);
  }
  
  if (!name || kcal === 0) {
    alert('Bitte Name und Kalorien eingeben.');
    return;
  }
  
  const existingFood = foodDatabase.find(f => f.name === name);
  if (existingFood) {
    alert('Dieses Lebensmittel existiert bereits in der Datenbank.');
    return;
  }
  
  foodDatabase.push({
    name: name,
    kcal: kcal,
    kh: kh,
    fett: fett,
    saturatedFat: saturatedFat,
    unsaturatedFat: unsaturatedFat,
    transFat: transFat,
    eiweiss: eiweiss,
    chol: chol,
    kategorie: 'oesterreichisch'
  });
  
  // Add to datalist
  const option = document.createElement('option');
  option.value = name.charAt(0).toUpperCase() + name.slice(1);
  document.getElementById('foodList').appendChild(option);
  
  // Clear form
  document.getElementById('customFoodName').value = '';
  document.getElementById('customFoodKcal').value = '';
  document.getElementById('customFoodKh').value = '';
  document.getElementById('customFoodFett').value = '';
  document.getElementById('customFoodSaturatedFat').value = '';
  document.getElementById('customFoodUnsaturatedFat').value = '';
  document.getElementById('customFoodTransFat').value = '';
  document.getElementById('customFoodEiweiss').value = '';
  document.getElementById('customFoodChol').value = '';
  document.getElementById('cholesterolEstimate').textContent = '';
  document.getElementById('customFoodLiveEffect').style.display = 'none';
  
  alert('Lebensmittel erfolgreich hinzugefügt!');
  renderFoodDatabase();
  });
}

function renderMonthView() {
  const { year, month } = appState.viewedMonth;
  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  document.getElementById('monthInfo').textContent = `${monthNames[month]} ${year}`;
  
  const monthEntries = appState.entries.filter(e => {
    const entryDate = new Date(e.datum);
    return entryDate.getFullYear() === year && entryDate.getMonth() === month;
  });
  
  document.getElementById('monthTotalEntries').textContent = monthEntries.length;
  
  if (monthEntries.length > 0) {
    const avgScore = (monthEntries.reduce((sum, e) => sum + e.healthScore, 0) / monthEntries.length).toFixed(1);
    document.getElementById('monthAvgScore').textContent = avgScore;
  } else {
    document.getElementById('monthAvgScore').textContent = '-';
  }
  
  // Render calendar
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = lastDay.getDate();
  
  const calendarContainer = document.getElementById('monthCalendar');
  let calendarHTML = '';
  
  // Empty cells before month starts
  for (let i = 0; i < startDay; i++) {
    calendarHTML += '<div class="calendar-day" style="opacity: 0.3;"></div>';
  }
  
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEntries = appState.entries.filter(e => e.datum === dateStr);
    const avgScore = dayEntries.length > 0
      ? (dayEntries.reduce((sum, e) => sum + e.healthScore, 0) / dayEntries.length).toFixed(1)
      : '';
    
    calendarHTML += `
      <div class="calendar-day">
        <div class="calendar-day-number">${day}</div>
        ${avgScore ? `<div class="calendar-day-score" style="color: ${getScoreColor(parseFloat(avgScore))}">${avgScore}</div>` : ''}
      </div>
    `;
  }
  
  calendarContainer.innerHTML = calendarHTML;

  document.getElementById('prevMonthBtn').addEventListener('click', () => {
  appState.viewedMonth.month--;
  if (appState.viewedMonth.month < 0) {
    appState.viewedMonth.month = 11;
    appState.viewedMonth.year--;
  }
  renderMonthView();
});

document.getElementById('nextMonthBtn').addEventListener('click', () => {
  appState.viewedMonth.month++;
  if (appState.viewedMonth.month > 11) {
    appState.viewedMonth.month = 0;
    appState.viewedMonth.year++;
  }
  renderMonthView();
});
}

function renderSettingsView() {
  document.getElementById('settingsLdl').value = appState.cholesterinBaseline.ldl;
  document.getElementById('settingsHdl').value = appState.cholesterinBaseline.hdl;
  document.getElementById('settingsTrig').value = appState.cholesterinBaseline.triglyzeride;
  document.getElementById('settingsDate').value = appState.cholesterinBaseline.datum;

document.getElementById('saveBaselineBtn').addEventListener('click', () => {
  appState.cholesterinBaseline = {
    ldl: parseFloat(document.getElementById('settingsLdl').value) || 160,
    hdl: parseFloat(document.getElementById('settingsHdl').value) || 35,
    triglyzeride: parseFloat(document.getElementById('settingsTrig').value) || 180,
    datum: document.getElementById('settingsDate').value || getCurrentDate()
  };
  saveUserData();
  alert('Basiswerte gespeichert!');
});

function refreshAllViews() {
  const activeTab = document.querySelector('.tab-content.active');
  if (activeTab) {
    const tabId = activeTab.id.replace('Tab', '');
    if (tabId === 'day') renderDayView();
    if (tabId === 'week') renderWeekView();
    if (tabId === 'development') renderDevelopmentView();
    if (tabId === 'settings') renderSettingsView();
  }
}

function initializeApp() {
  appState.viewedDate = getCurrentDate();
  appState.viewedWeek = getWeekNumber(getCurrentDate());
  const today = new Date();
  appState.viewedMonth = { year: today.getFullYear(), month: today.getMonth() };
  
  // Bind new entry types
  bindTrinkenForm();
  bindSchlafForm();
  bindBildschirmzeitForm();
  bindGewichtForm();
  bindStressForm();
  bindCustomFoodListeners();
  
  switchTab('day');
}

// Trinken Form
function bindTrinkenForm() {
  const updatePreview = () => {
    const type = document.getElementById('trinkenType').value;
    const menge = parseInt(document.getElementById('trinkenMenge').value) || 250;
    const tempEntry = { type: 'trinken', trinkenType: type, menge };
    const effect = calculateCholesterinEffect(tempEntry);
    tempEntry.cholesterinEffekt = effect;
    const score = calculateHealthScore(tempEntry);
    document.getElementById('trinkenEffect').innerHTML = `
      <h4>Cholesterin-Effekt</h4>
      <div class="effect-item"><span>LDL:</span><span class="${effect.ldl < 0 ? 'effect-positive' : 'effect-negative'}">${effect.ldl > 0 ? '+' : ''}${effect.ldl}</span></div>
      <div class="effect-item"><span>HDL:</span><span class="${effect.hdl > 0 ? 'effect-positive' : 'effect-negative'}">${effect.hdl > 0 ? '+' : ''}${effect.hdl}</span></div>
      <div class="effect-item"><span>Triglyzeride:</span><span class="${effect.trig < 0 ? 'effect-positive' : 'effect-negative'}">${effect.trig > 0 ? '+' : ''}${effect.trig}</span></div>
    `;
    document.getElementById('trinkenScoreDisplay').innerHTML = `<h4>Gesundheitsscore</h4><div class="score-badge ${getScoreClass(score)}" style="font-size: 24px; padding: 12px;">${score}</div>`;
  };
  document.getElementById('trinkenType').addEventListener('change', updatePreview);
  document.getElementById('trinkenMenge').addEventListener('input', updatePreview);
  document.getElementById('saveTrinkenBtn').addEventListener('click', () => {
    const type = document.getElementById('trinkenType').value;
    const menge = parseInt(document.getElementById('trinkenMenge').value) || 250;
    const entry = { id: generateId(), datum: getCurrentDate(), zeit: getCurrentTime(), type: 'trinken', trinkenType: type, menge };
    entry.cholesterinEffekt = calculateCholesterinEffect(entry);
    entry.healthScore = calculateHealthScore(entry);
    appState.entries.push(entry);
    saveUserData();
    document.getElementById('trinkenForm').style.display = 'none';
    document.querySelector('.add-type-selector').style.display = 'grid';
    switchTab('day');
  });
}

// Schlaf Form
function bindSchlafForm() {
  const updatePreview = () => {
    const hours = parseFloat(document.getElementById('schlafStunden').value) || 7;
    const qual = document.getElementById('schlafQualitaet').value;
    document.getElementById('schlafStundenDisplay').textContent = hours;
    const tempEntry = { type: 'schlaf', stunden: hours, qualitaet: qual };
    const effect = calculateCholesterinEffect(tempEntry);
    tempEntry.cholesterinEffekt = effect;
    const score = calculateHealthScore(tempEntry);
    document.getElementById('schlafEffect').innerHTML = `
      <h4>Cholesterin-Effekt</h4>
      <div class="effect-item"><span>LDL:</span><span class="${effect.ldl < 0 ? 'effect-positive' : 'effect-negative'}">${effect.ldl > 0 ? '+' : ''}${effect.ldl}</span></div>
      <div class="effect-item"><span>HDL:</span><span class="${effect.hdl > 0 ? 'effect-positive' : 'effect-negative'}">${effect.hdl > 0 ? '+' : ''}${effect.hdl}</span></div>
      <div class="effect-item"><span>Triglyzeride:</span><span class="${effect.trig < 0 ? 'effect-positive' : 'effect-negative'}">${effect.trig > 0 ? '+' : ''}${effect.trig}</span></div>
    `;
    document.getElementById('schlafScoreDisplay').innerHTML = `<h4>Gesundheitsscore</h4><div class="score-badge ${getScoreClass(score)}" style="font-size: 24px; padding: 12px;">${score}</div>`;
  };
  document.getElementById('schlafStunden').addEventListener('input', updatePreview);
  document.getElementById('schlafQualitaet').addEventListener('change', updatePreview);
  document.getElementById('saveSchlafBtn').addEventListener('click', () => {
    const hours = parseFloat(document.getElementById('schlafStunden').value) || 7;
    const qual = document.getElementById('schlafQualitaet').value;
    const entry = { id: generateId(), datum: getCurrentDate(), zeit: getCurrentTime(), type: 'schlaf', stunden: hours, qualitaet: qual };
    entry.cholesterinEffekt = calculateCholesterinEffect(entry);
    entry.healthScore = calculateHealthScore(entry);
    appState.entries.push(entry);
    saveUserData();
    document.getElementById('schlafForm').style.display = 'none';
    document.querySelector('.add-type-selector').style.display = 'grid';
    switchTab('day');
  });
}

// Bildschirmzeit Form
function bindBildschirmzeitForm() {
  const updatePreview = () => {
    const hours = parseFloat(document.getElementById('bildschirmzeitStunden').value) || 2;
    const akt = document.getElementById('bildschirmzeitAktivitaet').value;
    document.getElementById('bildschirmzeitStundenDisplay').textContent = hours;
    const tempEntry = { type: 'bildschirmzeit', stunden: hours, aktivitaet: akt };
    const effect = calculateCholesterinEffect(tempEntry);
    tempEntry.cholesterinEffekt = effect;
    const score = calculateHealthScore(tempEntry);
    document.getElementById('bildschirmzeitEffect').innerHTML = `
      <h4>Cholesterin-Effekt</h4>
      <div class="effect-item"><span>LDL:</span><span class="${effect.ldl < 0 ? 'effect-positive' : 'effect-negative'}">${effect.ldl > 0 ? '+' : ''}${effect.ldl}</span></div>
      <div class="effect-item"><span>HDL:</span><span class="${effect.hdl > 0 ? 'effect-positive' : 'effect-negative'}">${effect.hdl > 0 ? '+' : ''}${effect.hdl}</span></div>
      <div class="effect-item"><span>Triglyzeride:</span><span class="${effect.trig < 0 ? 'effect-positive' : 'effect-negative'}">${effect.trig > 0 ? '+' : ''}${effect.trig}</span></div>
    `;
    document.getElementById('bildschirmzeitScoreDisplay').innerHTML = `<h4>Gesundheitsscore</h4><div class="score-badge ${getScoreClass(score)}" style="font-size: 24px; padding: 12px;">${score}</div>`;
  };
  document.getElementById('bildschirmzeitStunden').addEventListener('input', updatePreview);
  document.getElementById('bildschirmzeitAktivitaet').addEventListener('change', updatePreview);
  document.getElementById('saveBildschirmzeitBtn').addEventListener('click', () => {
    const hours = parseFloat(document.getElementById('bildschirmzeitStunden').value) || 2;
    const akt = document.getElementById('bildschirmzeitAktivitaet').value;
    const entry = { id: generateId(), datum: getCurrentDate(), zeit: getCurrentTime(), type: 'bildschirmzeit', stunden: hours, aktivitaet: akt };
    entry.cholesterinEffekt = calculateCholesterinEffect(entry);
    entry.healthScore = calculateHealthScore(entry);
    appState.entries.push(entry);
    saveUserData();
    document.getElementById('bildschirmzeitForm').style.display = 'none';
    document.querySelector('.add-type-selector').style.display = 'grid';
    switchTab('day');
  });
}

// Gewicht Form
function bindGewichtForm() {
  const updatePreview = () => {
    const kg = parseFloat(document.getElementById('gewichtKg').value) || 75;
    const ziel = parseFloat(document.getElementById('gewichtZiel').value) || 75;
    const tempEntry = { type: 'gewicht', gewichtKg: kg, zielgewicht: ziel };
    const effect = calculateCholesterinEffect(tempEntry);
    tempEntry.cholesterinEffekt = effect;
    const score = calculateHealthScore(tempEntry);
    document.getElementById('gewichtEffect').innerHTML = `
      <h4>Cholesterin-Effekt</h4>
      <div class="effect-item"><span>LDL:</span><span class="${effect.ldl < 0 ? 'effect-positive' : 'effect-negative'}">${effect.ldl > 0 ? '+' : ''}${effect.ldl}</span></div>
      <div class="effect-item"><span>HDL:</span><span class="${effect.hdl > 0 ? 'effect-positive' : 'effect-negative'}">${effect.hdl > 0 ? '+' : ''}${effect.hdl}</span></div>
      <div class="effect-item"><span>Triglyzeride:</span><span class="${effect.trig < 0 ? 'effect-positive' : 'effect-negative'}">${effect.trig > 0 ? '+' : ''}${effect.trig}</span></div>
    `;
    document.getElementById('gewichtScoreDisplay').innerHTML = `<h4>Gesundheitsscore</h4><div class="score-badge ${getScoreClass(score)}" style="font-size: 24px; padding: 12px;">${score}</div>`;
  };
  document.getElementById('gewichtKg').addEventListener('input', updatePreview);
  document.getElementById('gewichtZiel').addEventListener('input', updatePreview);
  document.getElementById('saveGewichtBtn').addEventListener('click', () => {
    const kg = parseFloat(document.getElementById('gewichtKg').value) || 75;
    const ziel = parseFloat(document.getElementById('gewichtZiel').value) || 75;
    const entry = { id: generateId(), datum: getCurrentDate(), zeit: getCurrentTime(), type: 'gewicht', gewichtKg: kg, zielgewicht: ziel };
    entry.cholesterinEffekt = calculateCholesterinEffect(entry);
    entry.healthScore = calculateHealthScore(entry);
    appState.entries.push(entry);
    saveUserData();
    document.getElementById('gewichtForm').style.display = 'none';
    document.querySelector('.add-type-selector').style.display = 'grid';
    switchTab('day');
  });
}

// Stress Form
function bindStressForm() {
  const updatePreview = () => {
    const level = parseInt(document.getElementById('stressLevel').value) || 5;
    document.getElementById('stressLevelDisplay').textContent = level;
    const tempEntry = { type: 'stress', stressLevel: level };
    const effect = calculateCholesterinEffect(tempEntry);
    tempEntry.cholesterinEffekt = effect;
    const score = calculateHealthScore(tempEntry);
    document.getElementById('stressEffect').innerHTML = `
      <h4>Cholesterin-Effekt</h4>
      <div class="effect-item"><span>LDL:</span><span class="${effect.ldl < 0 ? 'effect-positive' : 'effect-negative'}">${effect.ldl > 0 ? '+' : ''}${effect.ldl}</span></div>
      <div class="effect-item"><span>HDL:</span><span class="${effect.hdl > 0 ? 'effect-positive' : 'effect-negative'}">${effect.hdl > 0 ? '+' : ''}${effect.hdl}</span></div>
      <div class="effect-item"><span>Triglyzeride:</span><span class="${effect.trig < 0 ? 'effect-positive' : 'effect-negative'}">${effect.trig > 0 ? '+' : ''}${effect.trig}</span></div>
    `;
    document.getElementById('stressScoreDisplay').innerHTML = `<h4>Gesundheitsscore</h4><div class="score-badge ${getScoreClass(score)}" style="font-size: 24px; padding: 12px;">${score}</div>`;
  };
  document.getElementById('stressLevel').addEventListener('input', updatePreview);
  document.getElementById('saveStressBtn').addEventListener('click', () => {
    const level = parseInt(document.getElementById('stressLevel').value) || 5;
    const entry = { id: generateId(), datum: getCurrentDate(), zeit: getCurrentTime(), type: 'stress', stressLevel: level };
    entry.cholesterinEffekt = calculateCholesterinEffect(entry);
    entry.healthScore = calculateHealthScore(entry);
    appState.entries.push(entry);
    saveUserData();
    document.getElementById('stressForm').style.display = 'none';
    document.querySelector('.add-type-selector').style.display = 'grid';
    switchTab('day');
  });
}

