using UnityEngine;

public class Attendee : Interactable
{
  [SerializeField] private UserObject userObject;

  public void UpdateAttendeeInfo(UserObject newUserObject)
  {
    userObject = ScriptableObject.Instantiate(newUserObject);
    
    if (userObject == null)
    {
      Debug.LogError("UserObject is null. Cannot update attendee info.");
      return;
    }
  }


  /*
    Called when user left-clicks on a avatar
    Calls the browser's openUserProfile callback 
  */
  public override void OnInteract()
  {
    if (userObject == null)
    {
      Debug.LogError("UserObject is null. Cannot interact with attendee.");
      return;
    }
    WebBridge.ShowProfile(userObject.id);
  }
}