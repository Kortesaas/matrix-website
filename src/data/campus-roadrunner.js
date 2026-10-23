// The Roadrunner (the Streetwork bus) in the 3D campus on the start page.
// Everything about it is set here; src/scripts/campus/roadrunner.js only
// reads this. Values marked PROVISIONAL are placeholders until the final
// design and route are decided.
//
// Coordinates are scene units on the ground (x to the right/east, z towards
// the viewer/south), like the basketball court in campus.ts. Floor-plan
// pixels convert with planX/planZ from campus-plan.js: x = (px − 1005) / 42,
// z = (py − 620) / 42. The island spans roughly x −50…33, z −24…25; the house
// x −17…23, z −14…14.

export const roadrunner = {
  // Shown on the start page. With false it only appears with ?roadrunner in
  // the address (e.g. /?roadrunner), for previews.
  enabled: true,

  // ---------- Appearance ----------
  appearance: {
    // "bus": the Streetwork bus built in code, modelled on the photos (a
    //   Mercedes MB 100 painted sky blue and white with clouds and
    //   "ROAD RUNNER" / "STREETWORK" lettering).
    // "sprite": a flat image facing the camera (src: an image in public/).
    // "model": a glTF/GLB file (src), loaded only when the scene starts.
    kind: 'bus',
    src: '',
    // Size in scene units (the house is about 40 long; a door is about 1).
    length: 5,
    width: 2.3,
    height: 2.6,
    // Turn the model if its nose doesn't point along +x (radians).
    yawOffset: 0,
    // "livery": the real paint (and the colours below).
    // "palette": tinted with the page colour like the rest of the diorama.
    colors: 'livery',
    livery: { body: '#bfe0f5', roof: '#ffffff', trim: '#2f3439', windows: '#5f87a6', wheels: '#1b1f24' },
  },

  // ---------- Positioning ----------
  // Ground level the wheels stand on.
  groundY: -0.13,
  // Parking spot marked on the map (behind the house, between the tree row
  // and the back wall): floor plan ≈ (1100, −170). The bus starts here.
  park: { at: [2.4, -18.8], heading: 0 },

  // ---------- Movement ----------
  route: {
    // Corner points of the loop, in driving order (PROVISIONAL): along the
    // back past the parking spot, down the path on the east side (x 26),
    // along the front path (z 20) and back up the west side.
    points: [
      [-25, -18.8],
      [26, -18.8],
      [26, 20],
      [-25, 20],
    ],
    closed: true,
    // How round the corners are (scene units).
    cornerRadius: 3.5,
    // Top speed (units per second; one lap is about 175 units) and how
    // quickly it speeds up and brakes (units per second²).
    speed: 7,
    acceleration: 4,
    // Where it stops on the way and for how long (seconds). The parking spot:
    // the bus starts there and drives off as soon as the page has loaded;
    // after each lap it parks again and, with waitForVisit, shows its "+"
    // until someone has hovered (or tapped) it and the card has closed again.
    // Then it does the next lap.
    stops: [{ at: [2.4, -18.8], seconds: 4, waitForVisit: true }],
  },

  // ---------- Animation ----------
  animation: {
    // Wheels turn with the distance driven (placeholder and models with
    // meshes named "wheel*").
    wheels: true,
    // A slight bounce while driving (units) and the lean into corners (radians).
    bounce: 0.04,
    lean: 0.05,
  },

  // ---------- Performance & accessibility ----------
  // Phones: drive too (true) or only stand on the parking spot (false).
  mobile: true,
  // Frames per second while driving on phones (the scene otherwise only
  // redraws when something changes).
  mobileFps: 30,
  // With "reduce motion" (system setting or the site's "Animationen aus"),
  // the bus stays parked.
  reducedMotion: 'park',

  // ---------- Interaction ----------
  // While parked it gets a "+" like the rooms; its card (title, text, photo,
  // link) is the "roadrunner" entry in campus.ts. While that card is open the
  // bus waits at its stop. The bus itself never takes clicks.
};
