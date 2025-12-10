export const uploadAlbum = (
	artistName: string,
	albumName: string,
	albumUuid: string,
) => `
<div
  style="background-color: #e7e7e7; border-radius: 6px; padding: 20px;">

  <h1>¡Nuevo álbum disponible!</h1>
  <p>${artistName} acaba de lanzar su nuevo álbum, ${albumName}. ¡Escúchala ahora y no te la pierdas!</p>
  <a href="${process.env.APP_BASE_URL}/album/${albumUuid}" class="button">Escuchar Ahora</a>
  <p>
    Gracias por unirte a esta revolución sonora.
  </p>
  <p>
    Con ritmo, <br/>
    El equipo de UnderSounds
  </p>
</div>
`;
