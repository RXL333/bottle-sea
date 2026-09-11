# Optional audio assets

Place licensed `.ogg`, `.mp3` or `.wav` files in this directory with these basenames:
`ocean-calm`, `wind`, `storm-wind`, `rain`, `thunder`, `seagull`, `wood-step`, `sand-step`, `grass-step`, `water-enter`, `underwater`, `ui-discover`.

Vite discovers only files that exist. Missing, invalid, or failed audio files use procedural fallback; the game never requests imaginary asset URLs. Looping ambient files should have seamless boundaries. Keep files short and compressed and record source/license alongside each file. Audio stays silent until the user presses the sound button.
