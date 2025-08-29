
const user_id = 'user-2'

const tasks = [{
    description: "Buy Grocieries",
    due_time: "2025-08-30 00:00:00"
},

{
    description: "Complete Assignment",
    due_time: "2025-09-01 14:00:00"
},
]

async function main() {
    // console.log("Adding tasks for", user_id)
    // const addTaskRes = await fetch(`http://localhost:5000/tasks`, {
    //     method: "POST",
    //     headers: {
    //         "Content-Type": "application/json"
    //     },
    //     body: JSON.stringify({ user_id, tasks })
    // })

    // const addTaskData = await addTaskRes.json()
    // // console.log("Add Task Response:", addTaskData)


    // console.log("Updating the first task")
    // const updateTaskRes = await fetch(`http://localhost:5000/tasks/${addTaskData[0].id}`, {
    //     method: "PUT",
    //     headers: {
    //         "Content-Type": "application/json"
    //     },
    //     body: JSON.stringify({ description: "Buy Groceries", due_time: "2025-08-30 14:00:00", user_id, taskId: addTaskData[0].id })
    // })

    // const updateTaskData = await updateTaskRes.json()
    // console.log("Update Task Response:", updateTaskData)


    // console.log("Fetching tasks for the updated task", addTaskData[0].id)
    // taskRes = await fetch(`http://localhost:5000/tasks?user_id=${user_id}`)
    // taskData = await taskRes.json()
    // console.log("Fetch Task Response:", taskData)


    console.log("Fetch tasks for", user_id)
    let taskRes = await fetch(`http://localhost:5000/tasks?user_id=${user_id}`)
    let taskData = await taskRes.json()

    console.log(taskData)
    console.log("Updating task for user:", user_id)
    const taskId = "cdaca582-967d-41ff-a6e7-57c0256817d7"
    const res = await fetch(`http://localhost:5000/tasks/${taskId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ description: "Updated Task", due_time: "2025-09-30 16:00:00", user_id })
    })


    console.log("Fetch tasks for", user_id)
    taskRes = await fetch(`http://localhost:5000/tasks?user_id=${user_id}`)
    taskData = await taskRes.json()

    console.log(taskData)



    // const data = await res.json()
    // console.log("Update Task Response:", data)
}

main();