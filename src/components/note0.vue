<template>
    <div>
        <textarea type="text" placeholder="title" v-model="newNote" @keyup.enter="addNote"/> <br>
        <textarea type="text" placeholder="message" v-model="newNoteMSG" @keyup.enter="addNote"/>
        <div v-for="(note, index) in notes" :key="note.id">
            <h4>{{note.title}} 
                <a class="remove-note" @click="removeNote(index)">
            &times;
                </a>
            </h4>
            <p>{{note.message}}</p>
            <br>
        </div>
    </div>
</template>

<script>
export default {
    name:'note0',
    data() {
        return {
            newNote:'',
            idForNote:3,
            notes:[
                {
                    'id':1,
                    'title': "groc423423423eries",
                    'message': "do34234242 that",
                },
                {
                    'id':2,
                    'title': "waldfghndfhdgfsk",
                    'message': "dont ddzsdgfsgfo that",
                }
            ]
        }
    },
    methods:{
        addNote() {
            if(this.newNote.trim().length==0 && this.newNoteMSG.trim().length==0){
                return
            }
            this.notes0.push({
                id: this.idForNote,
                title: this.newNote,
                message: this.newNoteMSG,
            })

            this.newNote = ''
            this.idForNote++
        },
        removeNote(index){
            this.notes.splice(index, 1)
        }
    }
}
</script>

<style lang="scss">
.remove-note:hover{
    cursor: pointer;
}

div{
    width: 100%
}
</style>
