/**
 * Diana component constants
 */
export declare const DIANA_SPRITE_URL = "/@ui-inspect/diana.webp";
export declare const TOGGLE_ID = "ui-inspect-toggle";
export declare const MENU_ID = "ui-inspect-menu";
export declare const TOAST_ID = "ui-inspect-toast";
export declare const POSITION_KEY = "ui-inspect:diana-position";
export declare const DIRECTION_KEY = "ui-inspect:diana-direction";
export declare const DIANA_SIZE: {
    width: number;
    height: number;
};
export declare const ANIMATION_DURATION: {
    readonly idle: 3600;
    readonly run: 900;
    readonly scan: 1200;
    readonly write: 1800;
    readonly rest: 1800;
    readonly sad: 2200;
    readonly standby: 3000;
    readonly process: 1200;
    readonly read: 2400;
};
export declare const SPRITE_POSITION: {
    readonly idle: {
        readonly x: 0;
        readonly y: 0;
    };
    readonly run: {
        readonly x: 0;
        readonly y: -78;
    };
    readonly scan: {
        readonly x: 0;
        readonly y: -156;
    };
    readonly write: {
        readonly x: 0;
        readonly y: -234;
    };
    readonly rest: {
        readonly x: 0;
        readonly y: -312;
    };
    readonly sad: {
        readonly x: 0;
        readonly y: -390;
    };
    readonly standby: {
        readonly x: 0;
        readonly y: -468;
    };
    readonly process: {
        readonly x: 0;
        readonly y: -546;
    };
    readonly read: {
        readonly x: 0;
        readonly y: -624;
    };
};
export declare const STATE_TEXT: Record<string, string>;
export declare const ICONS: {
    readonly source: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\"></path><polyline points=\"14 2 14 8 20 8\"></polyline><line x1=\"16\" y1=\"13\" x2=\"8\" y2=\"13\"></line><line x1=\"16\" y1=\"17\" x2=\"8\" y2=\"17\"></line><polyline points=\"10 9 9 9 8 9\"></polyline></svg>";
    readonly edit: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"></path><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"></path></svg>";
    readonly troubleshoot: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path d=\"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z\"></path><line x1=\"12\" y1=\"9\" x2=\"12\" y2=\"13\"></line><line x1=\"12\" y1=\"17\" x2=\"12.01\" y2=\"17\"></line></svg>";
    readonly batch: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"3\" width=\"7\" height=\"7\"></rect><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\"></rect><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\"></rect><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\"></rect></svg>";
    readonly history: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polyline points=\"12 6 12 12 16 14\"></polyline></svg>";
};
//# sourceMappingURL=constants.d.ts.map