/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.renameColumn("games", "card_id", "current_card_id");
  pgm.alterColumn("games", "current_card_id", { allowNull: true });

  pgm.addColumn("games", {
    active_color: { type: "colors", allowNull: true },
  });
};

exports.down = (pgm) => {
  pgm.renameColumn("games", "current_card_id", "card_id");
  pgm.alterColumn("games", "card_id", { allowNull: false });

  pgm.dropColumn("games", "active_color");
};
