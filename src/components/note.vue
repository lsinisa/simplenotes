<template>
  <div>
    <h1>simple notes</h1>
    <form action>
      <textarea type="text" placeholder="title" v-model="newNote" @keyup.enter="addNote"/>
      <br>
      <textarea type="text" placeholder="message" v-model="newNoteMsg" @keyup.enter="addNote"/>
    </form>
    <div>
        <div v-for="(note, index) in notes" :key="note.id">
          <h4>{{ note.title }}</h4>
          <a class="remove-note" @click="removeNote(index)">&times;</a>
          <p>{{ note.message }}</p>
          <br>
        </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'note',
  data() {
    return {
      idForNote: 1,
      newNote: '',
      newNoteMsg: '',
      notes: [
      ],
    };
  },
  methods: {
    addNote() {
      if (
        this.newNote.trim().length === 0 &&
        this.newNoteMsg.trim().length === 0
      ) {
        return;
      }
      this.notes.push({
        id: this.idForNote,
        title: this.newNote,
        message: this.newNoteMsg,
      });
      this.newNote = '';
      this.newNoteMsg = '';
      this.idForNote += 1;
    },
    removeNote(index) {
      this.notes.splice(index, 1);
    },
  },
};
</script>

<style lang="scss">
textarea {
  width: 100%;
  margin: auto;
  padding: auto;
  font-size: 1em;
  resize: none;
  border: 2px solid;
  border-radius: .3em;
}

.remove-note{
  float: right;
  padding: 2px 5px;
}

.remove-note:hover {
  background: #000;
  border-radius: 1em;
  color: #fff;
  cursor: pointer;
  padding: auto;
}
</style>
