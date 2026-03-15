import React, {useEffect, useState} from "react";
import IntersectionView from "./components/IntersectionView";
import LaneBarChart from "./components/LaneBarChart";
import { getTrafficData } from "./api";

function App(){

  const [trafficData,setTrafficData] = useState({
    lane_data:{}
  });

  useEffect(()=>{

    const interval = setInterval(async ()=>{

      const data = await getTrafficData();
      setTrafficData(data);

    },2000);

    return ()=>clearInterval(interval);

  },[]);

  return(

    <div>

      <h1 style={{textAlign:"center"}}>Smart Traffic Dashboard</h1>

      <IntersectionView laneData={trafficData.lane_data}/>

      <div style={{
        position:"fixed",
        bottom:"20px",
        right:"20px"
      }}>

        <LaneBarChart laneData={trafficData.lane_data}/>

      </div>

    </div>

  );
}

export default App;