import React, { useEffect, useRef } from 'react';
import Vex, { Stem } from 'vexflow';
import { xml2json } from 'xml-js';

const { Renderer, Stave, StaveNote, Formatter, Voice, Beam } = Vex.Flow;

const MusicNotation = ({ musicXML }) => {
  const containerRef = useRef(null);

  const durationMapping = {
    'whole': 'w',
    'half': 'h',
    'quarter': 'q',
    'eighth': '8',
    '16th': '16',
    '32nd': '32',
    '64th': '64'
  };

  useEffect(() => {
    if (!musicXML) return;

    // Clear the previous content
    containerRef.current.innerHTML = '';

    // Convert MusicXML to JSON
    const musicJSON = JSON.parse(xml2json(musicXML, { compact: true, spaces: 4 }));

    // Set up VexFlow
    const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
    const width = 760;
    const height = 100; // Adjust height dynamically if necessary
    const padding = 50;
    const staveWidth = (width - (1.1 *padding));
    const measureWidth = staveWidth / 2 - 40;

    // Calculate height dynamically based on the number of measures
    const measures = musicJSON['score-partwise'].part.measure;
    const rows = Math.ceil(measures.length / 2); //Her satır için 2 measure alıcaz
    renderer.resize(width, rows * (height * 2) + padding);
    const context = renderer.getContext();

    let x = padding;
    let y = padding;

    Vex.Flow.Stem.DOWN;

    // Extract notes from musicJSON
    //MEASURE YAZILDIĞI YER!
    measures.forEach((measure, index) => {
      //Separate the measures
      //Draw a line (vertical)
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, y + height );
      context.stroke();

      // If the stave is full, move to the next row.
      if (x  > width - padding) {
        x = padding;
        y += height * 2;
      }

      //Stave -> Nota çizgisi
      const stave = new Stave(x, y, staveWidth);
      const stave2 = new Stave(x, y + height, staveWidth);
      if (index === 0) {
        stave.addClef('treble').addTimeSignature('4/4'); //Burası sıkıntılı??? 4/2 de
        stave2.addClef('bass').addTimeSignature('4/4');
      }
      else if (index % 2 === 0) {
        stave.addClef('treble');
        stave2.addClef('bass');
      }
      stave.setContext(context).draw();
      stave2.setContext(context).draw();

      //Measurenotes of staff 1 and 2
      const staff1 = [];
      const staff2 = [];
      

      //Notes that will be printed
      const notes = [];
      const notes2 = [];

      //Beam arrangement for staff1 notes
      let beams = [];
      let totalBeams = [];
      let beam1Count = 0;
      
      //Beam arrangement for staff2 notes
      let beams2 = [];
      let totalBeams2 = [];
      let beam2Count = 0;
      const measureNotes = Array.isArray(measure.note) ? measure.note : [measure.note];


      //Separate notes by their staffs
      measureNotes.forEach(note => {
        if(note.staff._text == '1'){
          staff1.push(note);
        }
        else if(note.staff._text == '2'){
          staff2.push(note);
        }
      });


      //First staff's notes' operations
      staff1.forEach((note, indexx) => {
        const pitch = note.pitch;
        const rest = note.rest;
        const chord = note.chord;
        const keys = [];
        if (pitch) {
          const step = pitch.step._text.toLowerCase();
          const octave = pitch.octave._text;
          keys.push(`${step}/${octave}`);
        }
        if (rest) {
          keys.push('b/4');
        }
        //If have a value create staveNote (which will be printed)
        if (keys.length > 0) {

          const duration = note.type ? durationMapping[note.type._text] : 'q'; // Default to quarter if type is missing
          const actualDuration = rest ? `${note.duration._text}r` : duration; // If it is a rest, add 'r' to the duration.
          let stemDirection = Vex.Flow.Stem.UP; //Default stem direction is UP 

          if (pitch) {
            const stemDir = String(note.stem._text).toUpperCase();
            stemDirection = Vex.Flow.Stem[stemDir]; //Set the note's actual stem direction
          }
          //If the next note is chord.
          if (staff1[indexx + 1] && staff1[indexx + 1].chord && staff1[indexx + 1].staff._text == '1') { //If the next note is a chord. Handle it before and next time skip that.
            const pitchh = staff1[indexx + 1].pitch;
            const stepp = pitchh.step._text.toLowerCase();
            const octavee = pitchh.octave._text;
            keys.push(`${stepp}/${octavee}`);
          }
          //Set the drawable note attributes
          const staveNote = new StaveNote({
            keys: keys,
            duration: actualDuration,
            stem_direction: stemDirection,
          });
          if (chord) {
            //Handled one iteration before. Return.
            return;
          }
          //Get the last created note to arrange the beams
          const lastNote = notes.length > 0 ? notes[notes.length - 1] : null;
          //If durations are different, or the note is a rest, or the stem direction is different
          if (lastNote && lastNote.duration !== actualDuration || (actualDuration === 'qr') || (lastNote && lastNote.stem_direction !== stemDirection)) {
            if (beams.length > 1) {
              totalBeams[beam1Count] = [];
              for (let i = 0; i < beams.length; i++) {
                totalBeams[beam1Count].push(beams[i]);
                notes[notes.length - (1 + i)].setFlagStyle({ fillStyle: 'transparent', strokeStyle: 'transparent' }); //Set flag style to transparent so its not visible.
              }
              beam1Count++;
              //Empty beams
              beams = [];
            }
            else {
              beams = [];
            }
          }
          notes.push(staveNote);
          //If duration is 8, 16, 32, or 64 add the note to the beams array just in case.
          if (duration === '8' || duration === '16' || duration === '32' || duration === '64') {
            beams.push(staveNote);
          }
        }
      });

      //Second staff's notes' operations. Nearly the same as the first staff's operations. Check the previous loop's comments to understand the logic
      staff2.forEach((note, indexx) => {
        const pitch = note.pitch;
        const rest = note.rest;
        const chord = note.chord;
        const keys = [];
        if (pitch) {
          const step = pitch.step._text.toLowerCase();
          const octave = pitch.octave._text;
          keys.push(`${step}/${octave}`);
        }
        if (rest) {
          keys.push('b/2'); // Standard rest in bass clef, can adjust as needed
        }
        if (keys.length > 0) {
          const duration = note.type ? durationMapping[note.type._text] : 'q'; // Default to quarter if type is missing
          const actualDuration = rest ? `${note.duration._text}r` : duration;
          let stemDirection = Vex.Flow.Stem.UP;

          if (pitch) {
            const stemDir = String(note.stem._text).toUpperCase();
            stemDirection = Vex.Flow.Stem[stemDir];
          }
          if (staff2[indexx + 1] && staff2[indexx + 1].chord && staff2[indexx + 1].staff._text == '2') { //If the next note is a chord
            const pitchh = staff2[indexx + 1].pitch;
            const stepp = pitchh.step._text.toLowerCase();
            const octavee = pitchh.octave._text;
            keys.push(`${stepp}/${octavee}`);
          }
          const staveNote = new StaveNote({
            keys: keys,
            duration: actualDuration,
            clef: 'bass', // Specify bass clef
            stem_direction: stemDirection
          });
          if (chord) {
            //Handled one iteration before. Return.
            return;
          }
          const lastNote = notes2.length > 0 ? notes2[notes2.length - 1] : null;
          //If durations are different
          if (lastNote && lastNote.duration !== actualDuration || (actualDuration === 'qr') || rest || (lastNote && lastNote.stem_direction !== stemDirection)) {
            if (beams2.length > 1) {
              totalBeams2[beam2Count] = [];
              for (let i = 0; i < beams2.length; i++) {
                totalBeams2[beam2Count].push(beams2[i]);
                notes2[notes2.length - (1 + i)].setFlagStyle({ fillStyle: 'transparent', strokeStyle: 'transparent' }); //Set flag style to transparent
              }
              beam2Count++;
              //Empty beams
              beams2 = [];
            }
            else {
              beams2 = [];
            }
          }
          notes2.push(staveNote);
          if (duration === '8' || duration === '16' || duration === '32' || duration === '64') {
            beams2.push(staveNote);
          }
        }
      });

      //Set all beamed notes' flags to transparent (Cuz they already got beams)
      for(let i = 0 ; i < beams.length; i++){
        notes[notes.length - (1+i)].setFlagStyle({fillStyle: 'transparent', strokeStyle: 'transparent'});
      }
      for(let i = 0 ; i < beams2.length; i++){
        notes2[notes2.length - (1+i)].setFlagStyle({fillStyle: 'transparent', strokeStyle: 'transparent'});
      }

      //Draw stave1
      const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false).addTickables(notes);
      new Formatter().joinVoices([voice]).format([voice], measureWidth);
      voice.draw(context, stave); 

      //Draw stave2
      const voice2 = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false).addTickables(notes2);
      new Formatter().joinVoices([voice2]).format([voice2], measureWidth);
      voice2.draw(context, stave2);

      //Draw all the beams
      if (beams.length > 1) {
        const beam = new Beam(beams);
        beam.setContext(context).draw();
      }

      if (beams2.length > 1) {
        const beam = new Beam(beams2);
        beam.setContext(context).draw();
      }
      if(beam1Count > 0){
        for(let i = 0; i < beam1Count; i++){
          const beam = new Beam(totalBeams[i]);
          beam.setContext(context).draw();
        }
      }
      if(beam2Count > 0){
        for(let i = 0; i < beam2Count; i++){
          const beam = new Beam(totalBeams2[i]);
          beam.setContext(context).draw();
        }
      }

      x += measureWidth + padding; // Move to the next measure position
    });//End of a measure drawing
  }, [musicXML]);

  return (
    <div
      id="scrollable-container"
      style={{ width: '760px', height: '400px', overflow: 'auto', overflowX: 'hidden', border: '2px solid black'  }}
    >
      <div id="rendering-area" ref={containerRef}
      style={{marginLeft: '-40px', marginTop: '-80px'}}></div>
    </div>
  );
};

export default MusicNotation;