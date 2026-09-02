# Ambient tracks

Drop looping audio files here and register them in `src/services/ambient/tracks.ts`:

```ts
{ kind: 'file', id: 'above-the-clouds', name: 'Above the Clouds', src: '/audio/above-the-clouds.mp3' }
```

The engine loops them and handles the fades. Only add music you own or that is licensed for it --
nothing is downloaded automatically.

OVERHEAD ships with synthesised tracks so it needs no audio assets at all; these are optional.
