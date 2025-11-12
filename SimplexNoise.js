// SimplexNoise implementation for Three.js
// Based on Stefan Gustavson's implementation

THREE.SimplexNoise = function () {

    var F3 = 1 / 3;
    var G3 = 1 / 6;
    var simplex = [
        [ 1, 1, 0 ], [ - 1, 1, 0 ], [ 1, - 1, 0 ], [ - 1, - 1, 0 ],
        [ 1, 0, 1 ], [ - 1, 0, 1 ], [ 1, 0, - 1 ], [ - 1, 0, - 1 ],
        [ 0, 1, 1 ], [ 0, - 1, 1 ], [ 0, 1, - 1 ], [ 0, - 1, - 1 ]
    ];

    var p = [];
    for ( var i = 0; i < 256; i ++ ) {
        p[ i ] = Math.floor( Math.random() * 256 );
    }

    var perm = [];
    for ( var i = 0; i < 512; i ++ ) {
        perm[ i ] = p[ i & 255 ];
    }

    var grad3 = [
        [ 1, 1, 0 ], [ - 1, 1, 0 ], [ 1, - 1, 0 ], [ - 1, - 1, 0 ],
        [ 1, 0, 1 ], [ - 1, 0, 1 ], [ 1, 0, - 1 ], [ - 1, 0, - 1 ],
        [ 0, 1, 1 ], [ 0, - 1, 1 ], [ 0, 1, - 1 ], [ 0, - 1, - 1 ]
    ];

    function dot( g, x, y, z ) {
        return g[ 0 ] * x + g[ 1 ] * y + g[ 2 ] * z;
    }

    this.noise = function ( xin, yin, zin ) {

        var n0, n1, n2, n3;

        var s = ( xin + yin + zin ) * F3;
        var i = Math.floor( xin + s );
        var j = Math.floor( yin + s );
        var k = Math.floor( zin + s );
        var t = ( i + j + k ) * G3;
        var X0 = i - t;
        var Y0 = j - t;
        var Z0 = k - t;
        var x0 = xin - X0;
        var y0 = yin - Y0;
        var z0 = zin - Z0;

        var i1, j1, k1;
        var i2, j2, k2;
        if ( x0 >= y0 ) {
            if ( y0 >= z0 ) {
                i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
            } else if ( x0 >= z0 ) {
                i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;
            } else {
                i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;
            }
        } else {
            if ( y0 < z0 ) {
                i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;
            } else if ( x0 < z0 ) {
                i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;
            } else {
                i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
            }
        }

        var x1 = x0 - i1 + G3;
        var y1 = y0 - j1 + G3;
        var z1 = z0 - k1 + G3;
        var x2 = x0 - i2 + 2.0 * G3;
        var y2 = y0 - j2 + 2.0 * G3;
        var z2 = z0 - k2 + 2.0 * G3;
        var x3 = x0 - 1.0 + 3.0 * G3;
        var y3 = y0 - 1.0 + 3.0 * G3;
        var z3 = z0 - 1.0 + 3.0 * G3;

        var ii = i & 255;
        var jj = j & 255;
        var kk = k & 255;
        var gi0 = perm[ ii + perm[ jj + perm[ kk ] ] ] % 12;
        var gi1 = perm[ ii + i1 + perm[ jj + j1 + perm[ kk + k1 ] ] ] % 12;
        var gi2 = perm[ ii + i2 + perm[ jj + j2 + perm[ kk + k2 ] ] ] % 12;
        var gi3 = perm[ ii + 1 + perm[ jj + 1 + perm[ kk + 1 ] ] ] % 12;

        var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        if ( t0 < 0 ) {
            n0 = 0.0;
        } else {
            t0 *= t0;
            n0 = t0 * t0 * dot( grad3[ gi0 ], x0, y0, z0 );
        }
        var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        if ( t1 < 0 ) {
            n1 = 0.0;
        } else {
            t1 *= t1;
            n1 = t1 * t1 * dot( grad3[ gi1 ], x1, y1, z1 );
        }
        var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        if ( t2 < 0 ) {
            n2 = 0.0;
        } else {
            t2 *= t2;
            n2 = t2 * t2 * dot( grad3[ gi2 ], x2, y2, z2 );
        }
        var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        if ( t3 < 0 ) {
            n3 = 0.0;
        } else {
            t3 *= t3;
            n3 = t3 * t3 * dot( grad3[ gi3 ], x3, y3, z3 );
        }

        return 32.0 * ( n0 + n1 + n2 + n3 );

    };

};
