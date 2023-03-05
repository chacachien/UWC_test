// Chỉ dùng để đọc hiểu, hàm được lưu ở mongo, muốn thay đổi vui lòng liên hệ người viết


// Task State Manager
exports = async function () {
    const mongodb = context.services.get("Cluster");
    const db = mongodb.db("test");
    var collection = db.collection("tasks");
    var userCollection = db.collection("users");
    var mcpCollection = db.collection("mcp");
    var truckCollection = db.collection("trucks");
    try {
        const taskList = await collection.find().toArray();
        for (const i in taskList) {
            let task = taskList[i];

            const checkinDeadline = new Date(task.date.getTime() + 3600000 * (task.shift * 3 + 3.5));
            const checkoutDeadline = new Date(task.date.getTime() + 3600000 * (task.shift * 3 + 6.5));

            if (!task.checkIn && Date.now() > checkinDeadline.getTime() ||
                !task.checkOut && Date.now() > checkoutDeadline.getTime()) {
                task.state = "fail"
                await userCollection.updateOne({ _id: task.collector }, { $set: { truck: null } })
                await truckCollection.updateOne({ _id: task.truck }, { $set: { driver: null, path: [] } })
                for (const k in task.janitor) {
                    for (const l in task.janitor[i]) {
                        await userCollection.updateOne({ _id: task.janitor[k][l] }, { $set: { mcp: null } })
                        task.path[k] = await mcpCollection.findOne({ _id: task.path[k] })
                        task.path[k].janitor.filter((jan) => jan != task.janitor[k][l])
                    }
                    await MCPModel.updateOne({ _id: task.path[i]._id }, { $set: task.path[i] })
                }
            }

            collection.updateOne({ _id: task._id }, { $set: task });
        }
    } catch (error) {
        console.log(error)
    }
};

// Truck Location Manager
function dToInt(a) {
    // type nội bộ mongo => type float của js
    return parseFloat(a.toString());
}

exports = async function () {
    const mongodb = context.services.get("Cluster");
    const db = mongodb.db("test")
    var truckCollection = db.collection("trucks");
    var mcpCollection = db.collection("mcps");
    try {
        const truckList = await truckCollection.find().toArray();

        for (const i in truckList) {
            const truck = truckList[i];

            if (truck.nextMCP) {
                const index = (truck.path.map(x => x.toString())).indexOf(truck.nextMCP.toString(), 1)

                const nextMCP = await mcpCollection.findOne({ _id: truck.nextMCP })

                const distance = Math.sqrt((nextMCP.x - truck.x) * (nextMCP.x - truck.x) + (nextMCP.y - truck.y) * (nextMCP.y - truck.y));
                const cos = (nextMCP.x - truck.x) / distance;
                const sin = (nextMCP.y - truck.y) / distance;

                if (distance <= 4) {
                    // truong hop chua ve noi xuat phat
                    if (index < truck.path.length - 1) {
                        truck.x = nextMCP.x;
                        truck.y = nextMCP.y;
                        truck.nextMCP = truck.path[index + 1];
                        // thay doi load + xoa truck khoi danh sach 
                        if (nextMCP.load + truck.load < truck.cap) {
                            truck.load = truck.load + nextMCP.load;
                            nextMCP.load = 0;
                        } else {
                            truck.load = truck.cap;
                            nextMCP.load = nextMCP.load - truck.cap + truck.load;
                            // bom day thi tro ve tru so
                            truck.nextMCP = 0;
                        }
                        nextMCP.truck = nextMCP.truck.filter(t => t != truck._id)
                    } else {
                        truck.x = 0;
                        truck.y = 0;
                        truck.nextMCP = null;
                        truck.path = [];
                    }
                } else {
                    truck.x = dToInt(truck.x) + cos * 4;
                    truck.y = dToInt(truck.y) + sin * 4;
                }

                await truckCollection.updateOne({ _id: truck._id }, { $set: truck });
                await mcpCollection.updateOne({ _id: nextMCP._id }, { $set: nextMCP });
            }
        }
    } catch (error) {
        console.log(error)
    }
};

// MCP Load Manager
exports = async function () {
    const mongodb = context.services.get("Cluster");
    const db = mongodb.db("test");
    var mcpCollection = db.collection("mcps");
    var userCollection = db.collection("users");
    try {
        const mcpList = await mcpCollection.find().toArray();

        for (const i in mcpList) {
            const mcp = mcpList[i];
            let speed = 0;
            for (const i in mcp.janitor) {
                const janitor = await userCollection.find({ _id: mcp.janitor[i] });
                if (!janitor.available) speed++;
            }

            if (mcp.load < mcp.cap) {
                mcp.load = Math.min(mcp.load + 1 / 6 * speed, mcp.cap)
                mcpCollection.updateOne({ _id: mcp._id }, { $set: mcp });
            }
        }
    } catch (error) {
        console.log(error)
    }
};

