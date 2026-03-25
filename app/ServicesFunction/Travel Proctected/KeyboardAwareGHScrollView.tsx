// `listenToKeyboardEvents` is exported from the package (index.js) but missing from index.d.ts.
// @ts-expect-error TS2614
import { listenToKeyboardEvents } from "react-native-keyboard-aware-scroll-view";
import { ScrollView } from "react-native-gesture-handler";

/** KASV built on RNGH ScrollView — scroll wins over nested views & RNGH touchables. */
// RNGH ScrollView can be a forwardRef object; use curried form so it isn't
// mistaken as config by listenToKeyboardEvents.
const KeyboardAwareGHScrollView = listenToKeyboardEvents({})(ScrollView as any);

export default KeyboardAwareGHScrollView;
