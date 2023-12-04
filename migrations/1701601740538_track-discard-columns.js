/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropColumn("game_cards", "card_order");

  pgm.addColumn("game_cards", {
    discarded: {
      type: "boolean",
      notNull: true,
      default: "false",
    },
  });

  // Procedure
  pgm.sql(
    `CREATE OR REPLACE PROCEDURE start_game(a_game_id INT)
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_start_hand_size INT := 7;
      
      v_random_card_id INT;
      v_random_card_color COLORS;
      
      v_random_player_id INT;
    BEGIN
    -- 	Check if inactive game exists
      IF 0 = (
        SELECT COUNT(*) FROM games
        WHERE id = a_game_id
        AND active = false
      )
      THEN
        RAISE EXCEPTION 'Inactive Game with ID = % does not exist.', a_game_id;
      END IF;
    
    -- 	Import the deck and deal cards to all users
      CALL create_and_deal_deck(a_game_id, v_start_hand_size);
      
    -- 	Get a random card id
      SELECT
        gc.card_id, c.color
        INTO v_random_card_id, v_random_card_color
      FROM game_cards gc
      JOIN cards c ON gc.card_id = c.id
      WHERE (game_id = a_game_id)
      AND (user_id IS NULL)
      ORDER BY RANDOM() LIMIT 1;
      
    -- 	Get the random card's color
      SELECT color INTO v_random_card_color
      FROM cards
      WHERE id = v_random_card_id;
    -- 	If the color came up wild, choose a random real color
      IF v_random_card_color = 'wild' THEN
        SELECT color INTO v_random_card_color
        FROM cards
        WHERE color != 'wild'
        ORDER BY RANDOM() LIMIT 1;
      END IF;
      
    -- 	Get a random user id from the game
      SELECT users_id INTO v_random_player_id
      FROM game_users
      WHERE (game_id = a_game_id)
      ORDER BY RANDOM() LIMIT 1;
      
    -- 	Transition game object from Lobby to Game
      UPDATE games
      SET
        current_card_id = v_random_card_id,
        current_player_id = v_random_player_id,
        active = TRUE,
        updated_at = DEFAULT,
        started_at = CURRENT_TIMESTAMP,
        active_color = v_random_card_color
      WHERE id = a_game_id;
      
    -- 	Update Top card to be in 'discarded' state
      UPDATE game_cards
      SET discarded = true
      WHERE (card_id = v_random_card_id)
      AND (game_id = a_game_id);
      
    -- 	Initialize every player with a random seat number
      CALL randomize_seats(a_game_id);
    END;
    $$;`,
  );
};

exports.down = (pgm) => {
  pgm.dropColumn("game_cards", "discarded");

  pgm.addColumn("game_cards", {
    card_order: { type: "integer" },
  });

  // Procedure
  pgm.sql(
    `CREATE OR REPLACE PROCEDURE start_game(a_game_id INT)
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_start_hand_size INT := 7;
      
      v_random_card_id INT;
      v_random_card_color COLORS;
      
      v_random_player_id INT;
    BEGIN
    -- 	Check if inactive game exists
      IF 0 = (
        SELECT COUNT(*) FROM games
        WHERE id = a_game_id
        AND active = false
      )
      THEN
        RAISE EXCEPTION 'Inactive Game with ID = % does not exist.', a_game_id;
      END IF;
    
    -- 	Import the deck and deal cards to all users
      CALL create_and_deal_deck(a_game_id, v_start_hand_size);
      
    -- 	Get a random card id
      SELECT
        gc.card_id, c.color
        INTO v_random_card_id, v_random_card_color
      FROM game_cards gc
      JOIN cards c ON gc.card_id = c.id
      WHERE (game_id = a_game_id)
      AND (user_id IS NULL)
      ORDER BY RANDOM() LIMIT 1;
      
    -- 	Get the random card's color
      SELECT color INTO v_random_card_color
      FROM cards
      WHERE id = v_random_card_id;
    -- 	If the color came up wild, choose a random real color
      IF v_random_card_color = 'wild' THEN
        SELECT color INTO v_random_card_color
        FROM cards
        WHERE color != 'wild'
        ORDER BY RANDOM() LIMIT 1;
      END IF;
      
    -- 	Get a random user id from the game
      SELECT users_id INTO v_random_player_id
      FROM game_users
      WHERE (game_id = a_game_id)
      ORDER BY RANDOM() LIMIT 1;
      
    -- 	Transition game object from Lobby to Game
      UPDATE games
      SET
        current_card_id = v_random_card_id,
        current_player_id = v_random_player_id,
        active = TRUE,
        updated_at = DEFAULT,
        started_at = CURRENT_TIMESTAMP,
        active_color = v_random_card_color
      WHERE id = a_game_id;
      
    -- 	Update Top card to be in 'discarded' state
      UPDATE game_cards
      SET user_id = -1
      WHERE card_id = v_random_card_id;
      
    -- 	Initialize every player with a random seat number
      CALL randomize_seats(a_game_id);
    END;
    $$;`,
  );
};
