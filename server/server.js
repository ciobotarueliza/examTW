const express=require('express');
const bodyParser=require('body-parser');
const Sequelize=require('sequelize');
const cors=require('cors');
const { query } = require('express');
const { DataTypes } = require('sequelize');

//ne conectam la sequelize
const sequelize=new Sequelize({
    dialect:'sqlite',
    storage:'examTW.db',
    define:{
        timestamps:false
    }
})

//verificare
  sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });


//Definire entitati
const FavouriteList = sequelize.define('favouriteLists', {
    id:{
        primaryKey:true,
        allowNull:false,
        type:DataTypes.INTEGER,
        autoIncrement:true
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false,
        validate:{len: [3,255]}   //validarea ca stringul sa fie de cel putin 3 caractere
    },
    date:{
        type:DataTypes.DATE
    }

});

//a doua entitate
const Video=sequelize.define('videos',{
    id:{
        type:DataTypes.INTEGER,
        allowNull:false,
        primaryKey:true,
        autoIncrement:true
    },
    description:{
        type: DataTypes.STRING,
        allowNull: false,
        validate:{len: [5,255]}
    },
    title:{
        type:DataTypes.STRING,
        allowNull:false,
        validate:{len: [5,255]}
    },
    url:{
        type: DataTypes.STRING,
        validate: {
        isUrl: true,
    },
    }
})


//RELATIE ONE to MANY
FavouriteList.hasMany(Video);


const app=express();
app.use(cors());
app.use(bodyParser.json());


app.get('/sync',async(req,res)=>{
try{
    await sequelize.sync({force: true});
    res.status(201).json({message:'tables created'});
}catch(err)
{
    console.warn(err);
    res.status(500).json({message:'some error occured'})
}
});


//metode
async function handleSelectRecordsSorted(Model, field, direction, response) {
    let records = await Model.findAll({ order: [[field, direction]] });
    console.log('records ');
    console.log(records);
    responseForMultipleRecords(Model, records, response);
}

async function handleSelectRecordsPaginated(Model, page, pageSize, response) {
    let records = await Model.findAndCountAll({ offset: page - 1, limit: Number(pageSize) });
    console.log('records ');
    console.log(records);
    if (records.count > 0) {
        return response.json(records);
    }
    else {
        return response.status(404).json({
            message: "Couldn't retrieve " + Model.name
        });
    }
}


async function handleSelectRecordsFiltered(Model, fields, response) {
    let records = await Model.findAll({ where: fields});
    console.log('records ');
    console.log(records);
    responseForMultipleRecords(Model, records, response);
}

function responseForMultipleRecords(Model, records, response) {
    if (records.length > 0) {
        response.json(records);
    } else {
        response.status(404).json({
            message: "Couldn't retrieve " + Model.name
        });
    }
}

//paginate sort filter 
app.get('/favouriteLists/paginate', async (request, response) => {
    const page = request.query.page;
    const pageSize = request.query.pageSize;

    try {
        await handleSelectRecordsPaginated(FavouriteList, page, pageSize, response);
        response.status(200).send();
    }
    catch (err) {
        console.log(err);
        response.status(400).json({
            message: "Bad request",
        });
    }
});

app.get('/favouriteLists/sort', async (request, response) => {
    const { field, direction } = request.query;
    if (!field || !direction || (direction != 'ASC' && direction != 'DESC')) {
        return response.status(400).json({
            message: "Bad request",
        });
    }

    try {
        await handleSelectRecordsSorted(FavouriteList, field, direction, response);
        response.status(200).send();
    }
    catch (err) {
        console.log(err);
        response.status(400).json({
            message: "Bad request",
        });
    }
});

app.get('/favouriteLists/filter', async (request, response) => {
    const fields = request.query;
    console.log(fields);
    try {
        await handleSelectRecordsFiltered(FavouriteList, fields, response);
        response.status(200).send();
    }
    catch (err) {
        console.log(err);
        response.status(400).json({
            message: "Bad request",
        });
    }
});


app.get('/favouriteLists', async(req,res)=>{
    const {simplified, sortBy}=req.query;
    try{
       const favList=await FavouriteList.findAll({
           attributes:simplified?{exclude:"id"}:undefined//,
           //order:sortBy ? [[sortBy],'ASC']:undefined
       });
       res.status(200).json(favList);
    }catch(err)
    {
        console.warn(err);
        res.status(500).json({message:'some error occured'})
    }
});

//entitate 2 afisare
app.get('/videos', async(req,res)=>{
    const {simplified, sortBy}=req.query;
    try{
       const favList=await Video.findAll({
           attributes:simplified?{exclude:"id"}:undefined//,
           //order:sortBy ? [[sortBy],'ASC']:undefined
       });
       res.status(200).json(favList);
    }catch(err)
    {
        console.warn(err);
        res.status(500).json({message:'some error occured'})
    }
});

//adaugam un obiect
app.post('/favouriteLists',async(req,res)=>{
    try{
        await FavouriteList.create(req.body);
        res.status(201).json({message:'created'})
    }catch(err)
    {
        console.warn(err);
        res.status(500).json({message:'some error occured'})
    }
});


//obtinem un anumit obiect dupa id
app.get('/favouriteLists/:aid',async(req,res)=>{
    try{
        const favList=await FavouriteList.findByPk(req.params.aid); //,{include:Video});
       if(favList)
       {
           res.status(200).json(favList);
       }else{
           res.status(404).json({message:'not found'});
       }
        
     }catch(err)
     {
         console.warn(err);
         res.status(500).json({message:'some error occured'})
     }
});

//update prima entitate
app.put('/favouriteLists/:aid',async(req,res)=>{
    try{
        const favList=await FavouriteList.findByPk(req.params.aid);
       if(favList)
       {    await favList.update(req.body,{fields:['id','description','date']});
           res.status(202).json({message: 'accepted'});
       }else{
           res.status(404).json({message:'not found'});
       }
        
     }catch(err)
     {
         console.warn(err);
         res.status(500).json({message:'some error occured'})
     }
});

//stergem prima entitate
app.delete('/favouriteLists/:aid',async(req,res)=>{
    try{
        const favList=await FavouriteList.findByPk(req.params.aid);
       if(favList)
       {    await favList.destroy();
           res.status(202).json({message: 'accepted'});
       }else{
           res.status(404).json({message:'not found'});
       }
        
     }catch(err)
     {
         console.warn(err);
         res.status(500).json({message:'some error occured'})
     }
});

async function handleSelectRecordsById(Model, id) {
    return record = await Model.findOne({ where: { id } });
}

app.get('/videos/:id', async (req, response) => {
    try {
        const record = await handleSelectRecordsById(Video, req.params.id, response);
        if (record == null) {
            return response.status(404).send();
        }
        response.status(200).json(record).send();
    }
    catch (err) {
        console.log(err);
        response.status(400).json({
            message: "Bad request",
        });
    }
})


//Adaugare video 
app.post('/favouriteLists/:aid/videos',async(req,res,next)=>{
    try{
        const favouriteList=await FavouriteList.findByPk(req.params.aid);
       if(favouriteList)
       {    const video = new Video(req.body);  //const reference=new Reference(req.body);
            video.favouriteListId=favouriteList.id;
            //await Video.create(video);
            await video.save();
            res.status(201).json({message:'created'});
       }else{
           res.status(404).json({message:'not found'});
       }
        
     }catch(err)
     {
         console.warn(err);
         res.status(500).json({message:'some error occured'})
     }
});

//Sa obtinem toate melodiile dintr-o lista favorita 
app.get('/favouriteLists/:aid/videos',async(req,res)=>{
    try{
       const favouriteList=await FavouriteList.findByPk(req.params.aid, {
           include:[Video]
       });
       if(favouriteList)
       {   
        
        res.status(200).json(favouriteList.videos);
       }else{
           res.status(404).json({message:'not found'});
       }
        
     }catch(err)
     {
         console.warn(err);
         res.status(500).json({message:'some error occured'})
     }
});



app.get('/favouriteLists/:aid/videos/:vid',async(req,res)=>{
    try{
        const favList=await FavouriteList.findByPk(req.params.aid);
       if(favList)
       {    
            const videos = await FavouriteList.getVideos({where:{id:req.params.vid}});
            const video=videos.shift();
            if(video){
                res.status(200).json(video);
            }
            else{
                res.status(404).json({message:'video not found'});
            }
       }else{
           res.status(404).json({message:'favouriteList not found'});
       }
        
     }catch(err)
     {
         console.warn(err);
         res.status(500).json({message:'some error occured'})
     }
});

//update entitate 2 
app.put('/favouriteLists/:aid/videos/:vid',async(req,res)=>{
    try{
        const favouriteList = await FavouriteList.findByPk(req.params.aid);
       if(favouriteList)
       {    const videos = await favouriteList.getVideos({id:req.params.vid});
            const video=videos.shift();

            if(video){
                await video.update(req.body);
                res.status(202).json({message:'accepted'});
                // video.id=req.body.id;
                // video.description=req.body.description;
                // video.title=req.body.title;
                // video.url=req.body.url;
                // await video.save();
                // res.status(202).json({message:'accepted'});
            }
            else{
                res.status(404).json({message:'video not found'});
            }
       }else{
           res.status(404).json({message:'favouriteList not found'});
       }
        
     }catch(err)
     {
         console.warn(err);
         res.status(500).json({message:'some error occured'})
     }
});

//delete entitate2
app.delete('/favouriteLists/:aid/videos/:vid',async(req,res)=>{
    try{
      const favouriteList = await FavouriteList.findByPk(req.params.aid); 

       if(favouriteList)
       {    
            const videos=await favouriteList.getVideos({id: req.params.vid});  
            const video=videos.shift();

            if(video){
                await video.destroy();
                res.status(202).json({message:'accepted'});
            }
            else{
                res.status(404).json({message:'video not found'});
            }
       }else{
           res.status(404).json({message:'FavouriteList not found'});
       }
        
     }catch(err)
     {
         console.warn(err);
         res.status(500).json({message:'some error occured'})
     }
});

app.listen(8080);