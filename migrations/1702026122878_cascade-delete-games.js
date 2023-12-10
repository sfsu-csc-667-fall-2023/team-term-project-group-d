/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  /// Game Cards
  pgm.dropConstraint("game_cards", "game_cards_card_id_fkey");
  pgm.addConstraint("game_cards", "game_cards_card_id_fkey", {
    foreignKeys: {
      columns: "card_id",
      references: "cards(id)",
      onDelete: "CASCADE",
    },
  });

  pgm.dropConstraint("game_cards", "game_cards_game_id_fkey");
  pgm.addConstraint("game_cards", "game_cards_game_id_fkey", {
    foreignKeys: {
      columns: "game_id",
      references: "games(id)",
      onDelete: "CASCADE",
    },
  });

  pgm.dropConstraint("game_cards", "game_cards_user_id_fkey");
  pgm.addConstraint("game_cards", "game_cards_user_id_fkey", {
    foreignKeys: {
      columns: "user_id",
      references: "users(id)",
      onDelete: "CASCADE",
    },
  });

  /// Game Users
  pgm.dropConstraint("game_users", "game_users_game_id_fkey");
  pgm.addConstraint("game_users", "game_users_game_id_fkey", {
    foreignKeys: {
      columns: "game_id",
      references: "games(id)",
      onDelete: "CASCADE",
    },
  });

  pgm.dropConstraint("game_users", "game_users_users_id_fkey");
  pgm.addConstraint("game_users", "game_users_users_id_fkey", {
    foreignKeys: {
      columns: "users_id",
      references: "users(id)",
      onDelete: "CASCADE",
    },
  });
};

exports.down = (pgm) => {
  /// Game Cards
  pgm.dropConstraint("game_cards", "game_cards_card_id_fkey");
  pgm.addConstraint("game_cards", "game_cards_card_id_fkey", {
    foreignKeys: {
      columns: "card_id",
      references: "cards(id)",
    },
  });

  pgm.dropConstraint("game_cards", "game_cards_game_id_fkey");
  pgm.addConstraint("game_cards", "game_cards_game_id_fkey", {
    foreignKeys: {
      columns: "game_id",
      references: "games(id)",
    },
  });

  pgm.dropConstraint("game_cards", "game_cards_user_id_fkey");
  pgm.addConstraint("game_cards", "game_cards_user_id_fkey", {
    foreignKeys: {
      columns: "user_id",
      references: "users(id)",
    },
  });

  /// Game Users
  pgm.dropConstraint("game_users", "game_users_game_id_fkey");
  pgm.addConstraint("game_users", "game_users_game_id_fkey", {
    foreignKeys: {
      columns: "game_id",
      references: "games(id)",
    },
  });

  pgm.dropConstraint("game_users", "game_users_users_id_fkey");
  pgm.addConstraint("game_users", "game_users_users_id_fkey", {
    foreignKeys: {
      columns: "users_id",
      references: "users(id)",
    },
  });
};
