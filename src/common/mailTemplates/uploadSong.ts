export const uploadSong = (
	artistName: string,
	songName: string,
	songUuid: string,
) => `
<div
  style="background-color: #e7e7e7; border-radius: 6px; padding: 20px;">

  <h1>¡Nueva canción disponible!</h1>
  <p>${artistName} acaba de lanzar su nueva canción, ${songName}. ¡Escúchala ahora y no te la pierdas!</p>
  <a href="${process.env.APP_BASE_URL}/song/${songUuid}" class="button">Escuchar Ahora</a>
  <p>
    Gracias por unirte a esta revolución sonora.
  </p>
  <p>
    Con ritmo, <br/>
    El equipo de UnderSounds
  </p>
</div>
`;
