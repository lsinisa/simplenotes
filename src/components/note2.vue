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
    name:'note2',
    data() {
        return {
            newNote:'',
            idForNote:3,
            notes:[
                {
                    'id':1,
                    'title': "whatever",
                    'message': "do that",
                },
                {
                    'id':2,
                    'title': "wa231lk",
                    'message': "dont do that",
                }
            ]
        }
    },
    methods:{
        addNote() {
            if(this.newNote.trim().length==0 && this.newNoteMSG.trim().length==0){
                return
            }
            this.notes.push({
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
