<template>
  <div>
    <form action>
      <textarea type="text" placeholder="title" v-model="newNote" @keyup.enter="addNote"/>
      <br>
      <textarea type="text" placeholder="message" v-model="newNoteMsg" @keyup.enter="addNote"/>
    </form>
    <div>
      <transition-group :duration="{beforeEnter: 1000, leave: 800}">
        <div v-for="(note, index) in notes" :key="note.id">
          <h4>{{note.title}}</h4>
          <a class="remove-note" @click="removeNote(index)">&times;</a>
          <p>{{note.message}}</p>
          <br>
        </div>
      </transition-group>
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
        /*
        {
          id: 1,
          title: 'groceries',
          message: 'do that',
        },
        {
          id: 2,
          title: 'walk',
          message: 'dont do that',
        },
      */
      ],
    };
  },
  methods: {
    addNote() {
      if (
        this.newNote.trim().length === 0 &&
        this.newNoteMSG.trim().length === 0
      ) {
        return;
      }
      this.notes.push({
        id: this.idForNote,
        title: this.newNote,
        message: this.newNoteMsg,
      });

      this.newNote = '';
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
}
.remove-note{
  float: right;
}

.remove-note:hover {
  cursor: pointer;
}

textarea{
  font-size: 1em;
  resize: none;
  border: 2px solid;
  border-radius: 3%;
}
</style>
