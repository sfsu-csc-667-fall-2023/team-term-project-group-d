/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn("users", {
    image: {
      type: "varchar(85)",
      notNull: true,
      default: "https://robohash.org/a1b2c3",
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("users", "image");
};
