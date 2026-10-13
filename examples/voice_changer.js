// Voice Changer: your voice as a robot, a chipmunk or a monster.
// Use: pick a voice, then press "listen" to hear yourself. Wear headphones: through loudspeakers a microphone
// that hears itself howls. Or press "record", say something, and press "play" to hear it back in whichever
// voice is chosen now. With no microphone everything still works, and the picture says why there is nothing to hear.
// Try changing: 3, the seconds a recording lasts; add dial("ring", mic, "ring") or dial("crush", mic, "crush");
// play it back higher with take.soundLike(mic).play("G4"); or keep it, with saveSound(take, "me.wav").
//
// Run it:   pictures run voice_changer.js
// Share it: pictures build voice_changer.js -o site/
// The browser asks whether the page may use the microphone: say yes. (A page has to be served over https or from
// localhost to be given one, which `pictures run` does.)

const mic = useMicrophone()        // nothing is heard until it is listened to
let take = null

const says = label("Asking for the microphone")
select("voice", ["none", ...voiceNames()], { onChange: (voice) => { mic.voice = voice } })
dial("pitch", mic, "pitch")
dial("echo", mic, "echo")
toggle("listen", mic, "listening")
button("record", () => {
  take = mic.record(3)             // three seconds, starting now. It is given back at once and fills up behind
  says.value = "Recording"
  take.onDone(() => { says.value = take.seconds ? "Recorded: press play" : "Nothing was recorded: there is no microphone" })
})
button("play", () => {
  if (take) take.soundLike(mic).play()     // the same words, in the voice chosen now
})
scope(mic)
meter(mic)

mic.whenReady().then((there) => {
  says.value = there ? "Say something" : "No microphone here (" + mic.state + "): the console says why"
})

function draw() {
  background("midnightblue")
}
