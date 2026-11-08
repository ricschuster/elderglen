import Phaser from "phaser";
import { BedScene } from "./scenes/BedScene";
import { BinScene } from "./scenes/BinScene";
import { EndScene } from "./scenes/EndScene";
import { FarmScene } from "./scenes/FarmScene";
import { FestivalScene } from "./scenes/FestivalScene";
import { HallScene } from "./scenes/HallScene";
import { ProfessionScene } from "./scenes/ProfessionScene";
import { ReportScene } from "./scenes/ReportScene";
import { ShippingScene } from "./scenes/ShippingScene";
import { WitchTestScene } from "./scenes/WitchTestScene";
import { WitchWalkScene } from "./scenes/WitchWalkScene";
import { OptionsScene } from "./scenes/OptionsScene";
import { TitleScene } from "./scenes/TitleScene";
import { FarmChoiceScene } from "./scenes/FarmChoiceScene";
import { NameScene } from "./scenes/NameScene";
import { ShopScene } from "./scenes/ShopScene";
import { CatalogueScene } from "./scenes/CatalogueScene";
import { CarpenterScene } from "./scenes/CarpenterScene";
import { PlacementScene } from "./scenes/PlacementScene";
import { BarnScene } from "./scenes/BarnScene";
import { CoopScene } from "./scenes/CoopScene";
import { DebugScene } from "./scenes/DebugScene";
import { SkillsScene } from "./scenes/SkillsScene";
import { LiftScene } from "./scenes/LiftScene";
import { SmithScene } from "./scenes/SmithScene";
import { CraftingScene } from "./scenes/CraftingScene";
import { CookingScene } from "./scenes/CookingScene";
import { HatsScene } from "./scenes/HatsScene";
import { CaveChoiceScene } from "./scenes/CaveChoiceScene";
import { FishingScene } from "./scenes/FishingScene";
import { FurnaceScene } from "./scenes/FurnaceScene";
import { ChestScene } from "./scenes/ChestScene";
import { GreencoatScene } from "./scenes/GreencoatScene";
import { OrdersScene } from "./scenes/OrdersScene";
import { RequestsScene } from "./scenes/RequestsScene";
import { AchievementsScene } from "./scenes/AchievementsScene";
import { CollectionsScene } from "./scenes/CollectionsScene";
import { MailScene } from "./scenes/MailScene";
import { centreMenus, UI_SIZE_KEY, WORLD_ZOOM_KEY } from "./scenes/panel";
import { loadDeviceSettings } from "./scenes/storage";

// Throwaway test scenes, opened first with ?scene=witch or ?scene=witchwalk.
const tests = { witch: WitchTestScene, witchwalk: WitchWalkScene };
const wanted = new URLSearchParams(location.search).get("scene");
const first =
  wanted && wanted in tests ? [tests[wanted as keyof typeof tests]] : [];

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#2f4a35",
  pixelArt: true,
  // The canvas is the window (note 64). Menus draw in a centred 960 by 540 box.
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: "100%",
    height: "100%",
  },
  scene: [
    ...first,
    TitleScene,
    FarmChoiceScene,
    OptionsScene,
    FarmScene,
    ShopScene,
    CarpenterScene,
    PlacementScene,
    CoopScene,
    BarnScene,
    CatalogueScene,
    LiftScene,
    SmithScene,
    FurnaceScene,
    ChestScene,
    GreencoatScene,
    AchievementsScene,
    CollectionsScene,
    MailScene,
    OrdersScene,
    RequestsScene,
    CraftingScene,
    CookingScene,
    HatsScene,
    CaveChoiceScene,
    FishingScene,
    HallScene,
    FestivalScene,
    EndScene,
    ShippingScene,
    ReportScene,
    BinScene,
    BedScene,
    SkillsScene,
    // Dev builds only: Vite drops the debug menu from `npm run build`.
    ...(import.meta.env.DEV ? [DebugScene] : []),
    ProfessionScene,
    NameScene,
    ...Object.values(tests).filter((t) => !first.includes(t)),
  ],
});

// The zoom and UI size settings are kept live in the registry, so a change in
// Options shows at once and the farm reads them when it lays out.
const settings = loadDeviceSettings();
game.registry.set(WORLD_ZOOM_KEY, settings.worldZoom);
game.registry.set(UI_SIZE_KEY, settings.uiSize);
centreMenus(game, ["farm"]);
