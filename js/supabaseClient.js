/**
 * supabaseClient.js — Conexión y operaciones de base de datos con Supabase
 *
 * Responsable de:
 *  - Inicialización del cliente Supabase
 *  - Validación de unicidad global y registro de jugadores en tabla `players`
 *  - Guardado de puntuaciones en tabla `leaderboard`
 *  - Consulta de Top 10 global mediante JOIN relacional
 *  - Manejo resiliente de fallos de red / modo offline
 */

const SupabaseClient = (() => {

  // ── Configuración de Conexión ──────────────────────────────────────────────
  // Publishable Key oficial suministrada
  const SUPABASE_KEY = 'sb_publishable_EJL4T7mPbrZFHOmFwf1_Yg_tAQjNuum';
  
  // URL del proyecto Supabase corregida con el ID real del panel
  const SUPABASE_URL = window.SUPABASE_URL || 'https://laqnxljqiburhugbsqoa.supabase.co';

  let _client = null;
  let _initialized = false;

  /**
   * Obtiene o inicializa el cliente de Supabase
   */
  function getClient() {
    if (_client) return _client;
    try {
      if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          }
        });
        _initialized = true;
      }
    } catch (err) {
      console.warn('[Supabase] No se pudo inicializar el cliente:', err);
    }
    return _client;
  }

  /**
   * Valida la disponibilidad de un nombre de jugador y lo registra si es nuevo.
   */
  async function validateAndRegisterPlayer(playerName) {
    const cleanName = String(playerName || '').trim().toUpperCase();
    if (!cleanName || cleanName.length < 3) {
      return { success: false, error: 'El nombre debe tener al menos 3 caracteres.' };
    }

    const client = getClient();
    if (!client) {
      return { success: true, playerId: null, offline: true };
    }

    try {
      const { data: existingPlayer, error: searchError } = await client
        .from('players')
        .select('id, player_name')
        .eq('player_name', cleanName)
        .maybeSingle();

      if (searchError) {
        console.warn('[Supabase] Error al verificar jugador:', searchError);
        return { success: true, playerId: Storage.getPlayerId(), offline: true };
      }

      const storedPlayerId = Storage.getPlayerId();

      if (existingPlayer) {
        if (storedPlayerId && storedPlayerId === existingPlayer.id) {
          return { success: true, playerId: existingPlayer.id, isNew: false };
        } else {
          return {
            success: false,
            error: 'Este nombre ya está en uso por otro jugador. Por favor, elige otro.'
          };
        }
      }

      const { data: newPlayer, error: insertError } = await client
        .from('players')
        .insert([{ player_name: cleanName }])
        .select('id, player_name')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          return {
            success: false,
            error: 'Este nombre ya fue registrado hace un instante. Por favor, elige otro.'
          };
        }
        console.warn('[Supabase] Error al registrar jugador:', insertError);
        return { success: true, playerId: storedPlayerId, offline: true };
      }

      if (newPlayer && newPlayer.id) {
        Storage.setPlayerId(newPlayer.id);
        return { success: true, playerId: newPlayer.id, isNew: true };
      }

      return { success: true, playerId: null };
    } catch (err) {
      console.warn('[Supabase] Excepción en validateAndRegisterPlayer:', err);
      return { success: true, playerId: Storage.getPlayerId(), offline: true };
    }
  }

  /**
   * Guarda una puntuación en la tabla `leaderboard` vinculada al `player_id`.
   */
  async function saveScore(score, maxLevel = 1) {
    if (typeof score !== 'number' || score <= 0) {
      return { success: false, error: 'Puntuación no válida' };
    }

    const client = getClient();
    if (!client) {
      return { success: false, error: 'Cliente Supabase no disponible' };
    }

    try {
      let playerId = Storage.getPlayerId();
      const playerName = Storage.getPlayerName();

      if (!playerId && playerName && playerName !== 'Jugador') {
        const reg = await validateAndRegisterPlayer(playerName);
        if (reg.success && reg.playerId) {
          playerId = reg.playerId;
        }
      }

      if (!playerId) {
        console.warn('[Supabase] No hay player_id para asociar la puntuación');
        return { success: false, error: 'Sin ID de jugador' };
      }

      const { data, error } = await client
        .from('leaderboard')
        .insert([
          {
            player_id: playerId,
            score: Math.round(score),
            max_level: Math.max(1, Math.round(maxLevel)),
          }
        ]);

      if (error) {
        console.warn('[Supabase] Error al guardar récord:', error);
        return { success: false, error: error.message };
      }

      console.log('[Supabase] ✅ Puntuación guardada exitosamente en leaderboard');
      return { success: true };
    } catch (err) {
      console.warn('[Supabase] Excepción en saveScore:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Consulta el Top 10 global mediante JOIN entre `leaderboard` y `players`.
   */
  async function fetchTop10Leaderboard(limit = 10) {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'Sin conexión a Supabase' };
    }

    try {
      const { data, error } = await client
        .from('leaderboard')
        .select(`
          id,
          score,
          max_level,
          created_at,
          players (
            id,
            player_name
          )
        `)
        .order('score', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[Supabase] Error al obtener ranking:', error);
        return { success: false, error: error.message };
      }

      const formatted = (data || []).map(row => {
        const pName = row.players && row.players.player_name ? row.players.player_name : 'JUGADOR';
        return {
          name: pName,
          score: row.score || 0,
          maxLevel: row.max_level || 1,
          date: row.created_at ? new Date(row.created_at).toLocaleDateString('es-ES') : '',
        };
      });

      return { success: true, data: formatted };
    } catch (err) {
      console.warn('[Supabase] Excepción al obtener ranking:', err);
      return { success: false, error: err.message };
    }
  }

  // ── API pública ────────────────────────────────────────────────────────────
  return {
    getClient,
    validateAndRegisterPlayer,
    saveScore,
    fetchTop10Leaderboard,
  };

})();